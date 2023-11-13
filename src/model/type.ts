export interface Expense {
  id?: string;
  money?: number;
  tag?: string;
}

export interface PersonExpense {
  id?: String;
  personName?: String; 
  expenses?: Expense[];
}
