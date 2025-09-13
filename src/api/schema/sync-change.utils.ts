import { AnyBulkWriteOperation, BSON } from "mongodb";
import mongoose, { InferSchemaType } from "mongoose";
import Person from "../../db/persons";
import {
  ChangedPersons,
  ConflictPerson,
  PersonDiff,
  PersonPatch,
  PersonVersionId,
  TxPatch,
} from "./type";
import personUtils from "../../common/personUtils";

/**
 * Stores changes in database.
 * @returns conflicting updates for deleted data.
 */
export async function applyUpdates(
  { diff }: { diff: PersonDiff },
  context
): Promise<ConflictPerson[]> {
  const dbOperations: AnyBulkWriteOperation<
    InferSchemaType<typeof Person.schema>
  >[] = [];

  diff.added
    ?.map((person) => ({
      ...person,
      _id: new mongoose.Types.ObjectId(person._id),
      userId: new mongoose.Types.ObjectId(context.userId),
    }))
    .forEach((person) =>
      dbOperations.push({
        insertOne: { document: new Person(person).toObject() },
      })
    );

  diff.updated?.forEach((personPatch) => {
    if (personPatch.txDiff?.added?.length) {
      dbOperations.push({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(personPatch._id) },
          update: {
            $push: {
              txs: {
                $each: personPatch.txDiff?.added,
              },
            },
          },
        },
      });
    }
    if (personPatch.txDiff?.deleted?.length) {
      dbOperations.push({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(personPatch._id) },
          update: {
            $pull: {
              txs: {
                _id: {
                  $in: personPatch.txDiff?.deleted ?? [],
                },
              },
            },
          },
        },
      });
    }

    const personDetailsUpdates = Object.entries(personPatch).filter(
      ([key]: [keyof PersonPatch, any]) => key !== "_id" && key !== "txDiff"
    );

    if (personDetailsUpdates.length || personPatch.txDiff?.updated?.length) {
      dbOperations.push({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(personPatch._id) },
          update: {
            $set: Object.fromEntries([
              ...personDetailsUpdates,
              ...(personPatch.txDiff?.updated?.flatMap((tx) =>
                Object.entries(tx)
                  .filter(([key]: [keyof TxPatch, any]) => key !== "_id")
                  .map(([key, value]) => [`txs.$[elem${tx._id}].${key}`, value])
              ) ?? []),
            ]),
          },
          arrayFilters: personPatch.txDiff?.updated?.map((tx) => ({
            [`elem${tx._id}._id`]: tx._id,
          })),
        },
      });
    }
  });

  if (diff.deleted) {
    dbOperations.push({
      deleteMany: {
        filter: {
          _id: {
            $in: diff.deleted.map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
      },
    });
  }

  if (dbOperations.length > 0) {
    const response = await Person.collection.bulkWrite(
      dbOperations as AnyBulkWriteOperation<BSON.Document>[],
      {
        ordered: false,
      }
    );
  }

  return getConflicts(diff, context.userId);
}

/** Get deleted person/txs which client is trying to update. */
async function getConflicts(
  personDiff: PersonDiff,
  userId: string
): Promise<ConflictPerson[]> {
  if (personDiff.updated?.length) {
    const personIds = personDiff.updated?.map((person) => person._id);
    const existingPersons = await Person.where("userId")
      .equals(userId)
      .where("_id")
      .in(personIds)
      .lean();

    // just get deleted persons
    const deletedPersons = personIds
      .filter(
        (id) =>
          !existingPersons.find((person) => person._id.toHexString() === id)
      )
      .map((id) => ({ _id: id, isDeleted: true }));

    // just get deleted transaction tags
    const deletedTxs = personDiff.updated
      .map((updatedPerson) => ({
        updatedPerson,
        existingPerson: existingPersons.find(
          (person) => person._id.toHexString() === updatedPerson._id
        ),
      }))
      .filter((el) => el.updatedPerson.txDiff?.updated && el.existingPerson)
      .map((el) => {
        console.log(el.existingPerson?._id, el.updatedPerson._id);
        return {
          _id: el.updatedPerson._id,
          isDeleted: false,
          txs: el.updatedPerson
            .txDiff!.updated!.filter(
              (txEl) =>
                !el.existingPerson?.txs.find((tx) => tx._id === txEl._id)
            )
            .map((txEl) => ({ _id: txEl._id, isDeleted: true })),
        };
      })
      .filter((el) => el.txs.length);

    const conflicts: ConflictPerson[] = [...deletedPersons, ...deletedTxs];
    return conflicts;
  }
  return [];
}

/** @returns changes which are not present in client. */
export async function changedPersons(
  args: { month: string; personVersionIds: PersonVersionId[] },
  context
) {
  let query = Person.where("userId")
    .equals(context.userId)
    .where("month")
    .equals(args.month);
  if (args.personVersionIds.length > 0) {
    // get all person excluding onces with matching both _id and version in the list.
    query = query.where({
      $nor: args.personVersionIds,
    });
  }
  const persons = await query.lean();

  const addedPersons = persons.filter(
    (person) =>
      !args.personVersionIds.find(
        (personVersionId) => personVersionId._id == person._id.toString()
      )
  );
  const updatedPersons = persons.filter((person) =>
    args.personVersionIds.find(
      (personVersionId) =>
        personVersionId._id == person._id.toString() &&
        personVersionId.version != person.version
    )
  );

  // represent subset matchedPersons, where personVersionIds is superset
  const matchedPersons = args.personVersionIds.length
    ? await Person.where("userId")
        .equals(context.userId)
        .where("month")
        .equals(args.month)
        .where({
          _id: { $in: args.personVersionIds.map(({ _id }) => _id) },
        })
        .select("_id")
    : [];

  const deletedPersons = args.personVersionIds
    .filter(
      ({ _id }) =>
        !matchedPersons.find(
          (person) => person._id.toString() == _id.toString()
        )
    )
    .map((person) => person._id.toString());

  return {
    addedPersons,
    deletedPersons,
    updatedPersons,
  } satisfies ChangedPersons;
}

/**
 * Syncs changed persons list (in an **inline way**) with diff received from the client.
 *
 * Algorithm:
 * 1. Apply update diff to `updatedPersons` for consistency.
 * 2. Remove persons from `updatedPersons` if deleted in `diff`.
 * 3. Remove persons from `addedPersons` if deleted in `diff`.
 * 4. Remove persons from `deletedPersons` if added/updated in `diff`.
 *     - Represent conflicting change, will handle by client.
 */
export function syncChangedPersonsWithDiff(args: {
  diff: PersonDiff;
  changedPersonsList: ChangedPersons;
}) {
  const { diff, changedPersonsList } = args;

  // 1. Apply update diff to `updatedPersons` for consistency.
  personUtils.applyUpdateDiffToPersons({
    persons: changedPersonsList.updatedPersons,
    diff: diff,
  });

  // 2. Remove persons from `updatedPersons` if they are now deleted.
  changedPersonsList.updatedPersons = changedPersonsList.updatedPersons.filter(
    (person) => {
      return !diff.deleted?.find((id) => id == person._id.toString());
    }
  );

  // 3. Remove persons from `addedPersons` if they are now deleted.
  changedPersonsList.addedPersons = changedPersonsList.addedPersons.filter(
    (person) => {
      return !diff.deleted?.find((id) => id == person._id.toString());
    }
  );

  // 4. Remove persons from `deletedPersons` if client has added/updated them.
  //    Represent conflicting change, will handle by client.
  changedPersonsList.deletedPersons = changedPersonsList.deletedPersons.filter(
    (personId) => {
      return !(
        diff.added?.find((person) => personId == person._id) ||
        diff.updated?.find((person) => personId == person._id)
      );
    }
  );
}
