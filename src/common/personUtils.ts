import { applyOperation, Operation } from "fast-json-patch";
import { PersonData, PersonTx, Tx } from "../api/schema/type";
import { _deepClone } from "fast-json-patch/module/helpers";
import mongoose from "mongoose";

class PersonUtils {
  personTxToPerson(person: PersonTx): PersonData {
    return {
      _id: person._id?.toString()!,
      index: person.index,
      month: person.month,
      name: person.name,
      type: person.type,
      version: person.version,
      txs: person.txs.reduce<Record<string, Tx>>((txMap, tx) => {
        txMap[tx.index] = tx;
        return txMap;
      }, {}),
      txIds: person.txs.sort((a, b) => a.index - b.index).map((tx) => tx.index),
    };
  }
  personToPersonTx(person: PersonData, userId: string): PersonTx {
    return {
      _id: new mongoose.Types.ObjectId(person._id),
      userId: new mongoose.Types.ObjectId(userId),
      month: person.month,
      type: person.type,
      index: person.index,
      name: person.name,
      txs: Object.values(person.txs),
      version: person.version,
    };
  }

  applyChanges(updates: { persons: PersonTx[]; operations: Operation[] }) {
    const personMap = updates.persons
      .map((person) => this.personTxToPerson(person))
      .reduce<Record<string, PersonData>>((personMp, person) => {
        personMp[person._id] = person;
        return personMp;
      }, {});

    const updatedPersons = this._applyPatches(updates.operations, personMap);
    return Object.values(updatedPersons);
  }

  private _applyPatches(
    operations: Operation[],
    personMap: Record<string, PersonData>
  ): Record<string, PersonData> {
    let updatedPersonMap = _deepClone(personMap);
    operations.map(
      (operation) =>
        (updatedPersonMap = applyOperation(
          updatedPersonMap,
          operation,
          false
        ).newDocument)
    );
    return updatedPersonMap;
  }
}

const personUtils = new PersonUtils();
export default personUtils;
