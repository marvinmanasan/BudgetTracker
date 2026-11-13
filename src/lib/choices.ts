export type ChoiceKind = 'expense' | 'income';
export type CustomChoice = { id: string; kind: ChoiceKind; name: string };

export const PRESET_CHOICES: Record<ChoiceKind, readonly string[]> = {
  expense: ['Food', 'Transport', 'Bills', 'Shopping', 'School', 'Other'],
  income: ['Salary', 'Allowance', 'Freelance', 'Business', 'Gift', 'Other'],
};

export function choiceKey(name: string): string {
  return name.trim().normalize('NFC').toLowerCase();
}

export function validateChoice(kind: ChoiceKind, name: string): string {
  if (kind !== 'expense' && kind !== 'income') throw new Error('Choose expense or income.');
  if (typeof name !== 'string' || !name.trim() || name.length > 80) throw new Error('Enter a name with 1 to 80 characters.');
  const key = choiceKey(name);
  if (kind === 'expense' && key.replace(/\s+/g, ' ') === 'everything else') throw new Error('Everything Else is reserved for the automatic budget category. Choose another name.');
  if (PRESET_CHOICES[kind].some(preset => choiceKey(preset) === key)) throw new Error('That choice already exists.');
  return key;
}
