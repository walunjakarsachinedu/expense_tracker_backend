import { applyOperation, Operation } from "fast-json-patch";
import { PersonData, PersonTx, Tx } from "../api/schema/type";
import { _deepClone } from "fast-json-patch/module/helpers";

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
    changes: Operation[],
    persons: Record<string, PersonData>
  ): Record<string, PersonData> {
    let updatedPersons = _deepClone(persons);
    changes.map(
      (change) =>
        (updatedPersons = applyOperation(updatedPersons, change, false))
    );
    return updatedPersons;
  }
}

const personUtils = new PersonUtils();
export default personUtils;
