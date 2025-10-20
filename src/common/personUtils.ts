import { MonthDiff, PersonPatch, PersonTx, TxDiff } from "../api/schema/type";

class PersonUtils {
  /** Apply update patches **inline** to persons with matching _id. */
  applyUpdateDiffToPersons(args: { persons: PersonTx[]; diff: MonthDiff }) {
    const { persons, diff } = args;
    const diffUpdates: Record<string, PersonPatch | undefined> =
      this._toMapById(diff.updated ?? []);

    persons
      .map((person) => ({
        person,
        patch: diffUpdates[person._id.toHexString()],
      }))
      .map(this._applyPatchToPerson.bind(this));
  }

  /** Apply diff **inline**. */
  private _applyPatchToPerson(args: {
    person: PersonTx;
    patch: PersonPatch | undefined;
  }): PersonTx {
    const { patch, person } = args;
    if (!patch) return person;

    if (patch.index) person.index = patch.index;
    if (patch.name) person.name = patch.name;
    if (patch.txDiff) {
      this._applyTxDiffToPerson({ person, txDiff: patch.txDiff });
    }
    if (patch.version) person.version = patch.version;
    return person;
  }

  /** Apply diff **inline**. */
  private _applyTxDiffToPerson(args: { person: PersonTx; txDiff: TxDiff }) {
    const { person, txDiff } = args;
    txDiff.added?.forEach((tx) => person.txs.push(tx));
    person.txs = person.txs.filter(
      (tx) => !txDiff?.deleted?.find((id) => id == tx._id)
    );
    txDiff.updated?.forEach((diff) => {
      const tx = person.txs.find((tx) => tx._id == diff._id);
      if (!tx) return;
      if (diff.index) tx.index = diff.index;
      if (diff.money) tx.money = diff.money;
      if (diff.tag) tx.tag = diff.tag;
    });

    person.txs = person.txs.sort((a, b) => a.index - b.index);
    person.txs.forEach((tx, index) => (tx.index = index));
  }

  private _toMapById<T extends { _id: string }>(arr: T[]): Record<string, T> {
    return arr.reduce((acc, cur) => {
      acc[cur._id] = cur;
      return acc;
    }, {} as Record<string, T>);
  }
}

const personUtils = new PersonUtils();
export default personUtils;
