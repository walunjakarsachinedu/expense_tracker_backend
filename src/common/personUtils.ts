import mongoose from "mongoose";
import { PersonData, PersonTx, Tx } from "../api/schema/type";

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
        txMap[tx._id] = tx;
        return txMap;
      }, {}),
      txIds: person.txs.sort((a, b) => a.index - b.index).map((tx) => tx._id),
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
}

const personUtils = new PersonUtils();
export default personUtils;
