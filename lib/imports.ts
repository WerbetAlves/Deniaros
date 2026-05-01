import type { Category, Payee, Transaction } from "@/lib/domain";

export type ParsedImportRow = {
  amount: number;
  categoryName?: string;
  date: string;
  description: string;
  payeeName?: string;
  subcategoryName?: string;
};

export const importRuleMatchFieldOptions = [
  { id: "description", label: "Descrição" },
  { id: "payee", label: "Favorecido" }
] as const;

export const importRuleMatchTypeOptions = [
  { id: "contains", label: "Contem" },
  { id: "starts_with", label: "Comeca com" },
  { id: "equals", label: "Igual a" }
] as const;

export const importRuleStatusOptions = [
  { id: "keep", label: "Manter selecionado na importação" },
  { id: "pending", label: "Marcar como pendente" },
  { id: "posted", label: "Marcar como lançado" }
] as const;

export type ImportRuleMatchField = (typeof importRuleMatchFieldOptions)[number]["id"];
export type ImportRuleMatchType = (typeof importRuleMatchTypeOptions)[number]["id"];
export type ImportRuleStatusMode = (typeof importRuleStatusOptions)[number]["id"];

export type ImportRule = {
  id: string;
  isActive: boolean;
  matchField: ImportRuleMatchField;
  matchType: ImportRuleMatchType;
  name: string;
  pattern: string;
  priority: number;
  scopeAccountId?: string;
  setCategoryId?: string;
  setPayeeId?: string;
  setStatus: ImportRuleStatusMode;
  workspaceId: string;
};

export type ImportRuleRow = {
  id: string;
  is_active: boolean | null;
  match_field: string | null;
  match_type: string | null;
  name: string;
  pattern: string;
  priority: number | null;
  scope_account_id: string | null;
  set_category_id: string | null;
  set_payee_id: string | null;
  set_status: string | null;
  workspace_id: string;
};

export type ImportDuplicateCandidate = {
  accountId: string;
  amount: number;
  date: string;
  description: string;
  importSignature?: string | null;
};

export type ImportDuplicateMatch = {
  reason: "signature" | "same_day_amount_description";
  transaction: ImportDuplicateCandidate;
};

type CsvRow = Record<string, string>;

const dateAliases = ["date", "data", "occurred_on", "posted_on", "transaction_date"];
const descriptionAliases = [
  "description",
  "descricao",
  "descrição",
  "descrição",
  "histórico",
  "histórico",
  "historico",
  "memo",
  "title",
  "lancamento",
  "lançamento",
  "lançamento"
];
const amountAliases = ["amount", "valor", "value", "total", "amount_brl"];
const typeAliases = ["type", "tipo", "nature", "natureza", "entry_type"];
const payeeAliases = ["payee", "favorecido", "merchant", "recipient", "beneficiary"];
const categoryAliases = ["category", "categoria"];
const subcategoryAliases = ["subcategory", "subcategoria"];

export function parseImportCsv(input: string) {
  const text = input.replace(/^\uFEFF/, "").trim();

  if (!text) {
    return [];
  }

  const delimiter = detectDelimiter(text);
  const rawRows = parseDelimitedRows(text, delimiter);

  if (rawRows.length < 2) {
    return [];
  }

  const headers = rawRows[0].map((cell) => normalizeHeader(cell));
  const rows: CsvRow[] = rawRows.slice(1).map((cells) => {
    const row: CsvRow = {};

    headers.forEach((header, index) => {
      row[header] = String(cells[index] ?? "").trim();
    });

    return row;
  });

  return rows
    .map(mapCsvRow)
    .filter((row): row is ParsedImportRow => Boolean(row));
}

export function parseImportStatement(input: string) {
  return detectImportSourceType(input) === "qif" ? parseImportQif(input) : parseImportCsv(input);
}

export function detectImportSourceType(input: string): "csv" | "qif" {
  const text = input.replace(/^\uFEFF/, "").trim();

  if (/^!Type:/im.test(text) || (/^\^$/m.test(text) && /^D.+$/m.test(text) && /^T.+$/m.test(text))) {
    return "qif";
  }

  return "csv";
}

export function buildTransactionSignature(transaction: {
  accountId: string;
  amount: number;
  date: string;
  description: string;
}) {
  return [
    transaction.accountId,
    transaction.date,
    normalizeSignatureText(transaction.description),
    transaction.amount.toFixed(2)
  ].join("|");
}

export function findImportDuplicate({
  accountId,
  row,
  signature,
  transactions
}: {
  accountId: string;
  row: ParsedImportRow;
  signature: string;
  transactions: ImportDuplicateCandidate[];
}): ImportDuplicateMatch | null {
  for (const transaction of transactions) {
    if (transaction.accountId !== accountId) {
      continue;
    }

    const transactionSignature =
      transaction.importSignature ??
      buildTransactionSignature({
        accountId: transaction.accountId,
        amount: transaction.amount,
        date: transaction.date,
        description: transaction.description
      });

    if (transactionSignature === signature) {
      return {
        reason: "signature",
        transaction
      };
    }

    if (
      transaction.date === row.date &&
      toCents(transaction.amount) === toCents(row.amount) &&
      areImportDescriptionsLikelySame(transaction.description, row.description)
    ) {
      return {
        reason: "same_day_amount_description",
        transaction
      };
    }
  }

  return null;
}

export function matchCategoryId({
  categories,
  categoryName,
  subcategoryName
}: {
  categories: Category[];
  categoryName?: string;
  subcategoryName?: string;
}) {
  if (!categoryName && !subcategoryName) {
    return null;
  }

  const normalizedCategory = normalizeLookupText(categoryName ?? "");
  const normalizedSubcategory = normalizeLookupText(subcategoryName ?? "");
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  if (normalizedCategory && normalizedCategory.includes("/")) {
    const [rootName, childName] = normalizedCategory.split("/").map((part) => part.trim());
    const directMatch = categories.find((category) => {
      if (!category.parentId) {
        return false;
      }

      const parent = categoryById.get(category.parentId);
      return (
        normalizeLookupText(category.name) === childName &&
        normalizeLookupText(parent?.name ?? "") === rootName
      );
    });

    if (directMatch) {
      return directMatch.id;
    }
  }

  if (normalizedCategory && normalizedSubcategory) {
    const detailedMatch = categories.find((category) => {
      if (!category.parentId) {
        return false;
      }

      const parent = categoryById.get(category.parentId);
      return (
        normalizeLookupText(category.name) === normalizedSubcategory &&
        normalizeLookupText(parent?.name ?? "") === normalizedCategory
      );
    });

    if (detailedMatch) {
      return detailedMatch.id;
    }
  }

  if (normalizedSubcategory) {
    const childMatch = categories.find(
      (category) =>
        Boolean(category.parentId) &&
        normalizeLookupText(category.name) === normalizedSubcategory
    );

    if (childMatch) {
      return childMatch.id;
    }
  }

  if (normalizedCategory) {
    const categoryMatch = categories.find(
      (category) => normalizeLookupText(category.name) === normalizedCategory
    );

    if (categoryMatch) {
      return categoryMatch.id;
    }
  }

  return null;
}

export function findPayeeIdByName(payees: Payee[], payeeName?: string) {
  const normalizedName = normalizeLookupText(payeeName ?? "");

  if (!normalizedName) {
    return null;
  }

  const match = payees.find((payee) => normalizeLookupText(payee.name) === normalizedName);
  return match?.id ?? null;
}

function mapCsvRow(row: CsvRow): ParsedImportRow | null {
  const dateRaw = getFirstValue(row, dateAliases);
  const description = getFirstValue(row, descriptionAliases);
  const amountRaw = getFirstValue(row, amountAliases);
  const typeRaw = getFirstValue(row, typeAliases);
  const payeeName = getFirstValue(row, payeeAliases);
  const categoryRaw = getFirstValue(row, categoryAliases);
  const subcategoryRaw = getFirstValue(row, subcategoryAliases);

  const date = parseFlexibleDate(dateRaw);
  const amount = parseFlexibleAmount(amountRaw, typeRaw);

  if (!date || !description || amount === null) {
    return null;
  }

  const parsedCategory = splitCategoryPath(categoryRaw);

  return {
    amount,
    categoryName: parsedCategory.categoryName,
    date,
    description,
    payeeName: payeeName || undefined,
    subcategoryName: subcategoryRaw || parsedCategory.subcategoryName || undefined
  };
}

function parseImportQif(input: string) {
  const text = input.replace(/^\uFEFF/, "").trim();

  if (!text) {
    return [];
  }

  return text
    .split(/\r?\n\^\r?\n?/)
    .map((record) => mapQifRecord(record))
    .filter((row): row is ParsedImportRow => Boolean(row));
}

function mapQifRecord(record: string): ParsedImportRow | null {
  const fields = new Map<string, string[]>();

  for (const rawLine of record.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("!")) {
      continue;
    }

    const tag = line.slice(0, 1);
    const value = line.slice(1).trim();

    if (!tag || !value) {
      continue;
    }

    const values = fields.get(tag) ?? [];
    values.push(value);
    fields.set(tag, values);
  }

  const date = parseQifDate(getQifValue(fields, "D"));
  const amount = parseFlexibleAmount(getQifValue(fields, "T"), "");
  const payeeName = getQifValue(fields, "P");
  const memo = getQifValue(fields, "M");
  const categoryRaw = getQifValue(fields, "L");
  const description = payeeName || memo;

  if (!date || !description || amount === null) {
    return null;
  }

  const parsedCategory = splitCategoryPath(categoryRaw.replace(/^\[|\]$/g, ""));

  return {
    amount,
    categoryName: parsedCategory.categoryName,
    date,
    description,
    payeeName: payeeName || undefined,
    subcategoryName: parsedCategory.subcategoryName,
  };
}

function getQifValue(fields: Map<string, string[]>, tag: string) {
  return fields.get(tag)?.[0]?.trim() ?? "";
}

function parseQifDate(value: string) {
  const raw = value.trim().replace(/'/g, "/");

  if (!raw) {
    return null;
  }

  const match = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);

  if (!match) {
    return parseFlexibleDate(raw);
  }

  const first = Number.parseInt(match[1], 10);
  const second = Number.parseInt(match[2], 10);
  const yearRaw = Number.parseInt(match[3], 10);
  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
  const day = first > 12 ? first : second;
  const month = first > 12 ? second : first;

  if (!isValidDateParts(year, month, day)) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

function parseDelimitedRows(text: string, delimiter: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === "\"") {
      if (inQuotes && nextCharacter === "\"") {
        currentCell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (!inQuotes && character === delimiter) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (!inQuotes && (character === "\n" || character === "\r")) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += character;
  }

  currentRow.push(currentCell);
  rows.push(currentRow);
  return rows.filter((row) => row.some((cell) => cell.trim() !== ""));
}

function normalizeHeader(value: string) {
  return normalizeLookupText(value)
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeLookupText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSignatureText(value: string) {
  return normalizeLookupText(value).replace(/\s+/g, " ");
}

function areImportDescriptionsLikelySame(left: string, right: string) {
  const normalizedLeft = normalizeSignatureText(left).replace(/[^a-z0-9 ]+/g, " ");
  const normalizedRight = normalizeSignatureText(right).replace(/[^a-z0-9 ]+/g, " ");

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  if (normalizedLeft === normalizedRight) {
    return true;
  }

  const shortest = normalizedLeft.length <= normalizedRight.length ? normalizedLeft : normalizedRight;
  const longest = normalizedLeft.length > normalizedRight.length ? normalizedLeft : normalizedRight;

  if (shortest.length >= 8 && longest.includes(shortest)) {
    return true;
  }

  const leftTokens = buildDescriptionTokenSet(normalizedLeft);
  const rightTokens = buildDescriptionTokenSet(normalizedRight);

  if (leftTokens.size < 2 || rightTokens.size < 2) {
    return false;
  }

  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return shared / Math.min(leftTokens.size, rightTokens.size) >= 0.67;
}

function buildDescriptionTokenSet(value: string) {
  return new Set(
    value
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= 3)
  );
}

function toCents(value: number) {
  return Math.round(value * 100);
}

function getFirstValue(row: CsvRow, aliases: string[]) {
  const key = aliases.find((alias) => row[alias] !== undefined);
  return key ? row[key].trim() : "";
}

function parseFlexibleDate(value: string) {
  const raw = value.trim();

  if (!raw) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const slashMatch = raw.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);

  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    if (!isValidDateParts(Number(year), Number(month), Number(day))) {
      return null;
    }
    return `${year}-${month}-${day}`;
  }

  const yearFirstMatch = raw.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);

  if (yearFirstMatch) {
    const [, year, month, day] = yearFirstMatch;
    if (!isValidDateParts(Number(year), Number(month), Number(day))) {
      return null;
    }
    return `${year}-${month}-${day}`;
  }

  return null;
}

function isValidDateParts(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parseFlexibleAmount(amountRaw: string, typeRaw: string) {
  const raw = amountRaw.trim();

  if (!raw) {
    return null;
  }

  const cleaned = raw.replace(/[^\d,.\-+]/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized = cleaned;

  if (lastComma > lastDot) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    normalized = cleaned.replace(/,/g, "");
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  const type = normalizeLookupText(typeRaw);

  if (type.includes("debit") || type.includes("debito") || type.includes("débito") || type.includes("despesa")) {
    return -Math.abs(parsed);
  }

  if (type.includes("credit") || type.includes("credito") || type.includes("crédito") || type.includes("receita")) {
    return Math.abs(parsed);
  }

  return parsed;
}

function splitCategoryPath(value: string) {
  const raw = value.trim();

  if (!raw) {
    return {
      categoryName: undefined,
      subcategoryName: undefined
    };
  }

  const parts = raw
    .split(/[:>/|]/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      categoryName: parts[0],
      subcategoryName: parts[parts.length - 1]
    };
  }

  return {
    categoryName: raw,
    subcategoryName: undefined
  };
}

export function buildImportSummary({
  createdPayees,
  duplicatéd,
  imported,
  parsed
}: {
  createdPayees: number;
  duplicatéd: number;
  imported: number;
  parsed: number;
}) {
  return `${imported} movimento(s) importado(s), ${duplicatéd} duplicado(s) ignorado(s) e ${createdPayees} favorecido(s) criado(s) a partir de ${parsed} linha(s) válidas.`;
}

export function extractImportPreview(rows: ParsedImportRow[]) {
  return rows.slice(0, 5);
}

export function mapImportRule(row: ImportRuleRow): ImportRule {
  return {
    id: row.id,
    isActive: row.is_active ?? true,
    matchField: normalizeImportRuleMatchField(row.match_field),
    matchType: normalizeImportRuleMatchType(row.match_type),
    name: row.name,
    pattern: row.pattern,
    priority: Number.isFinite(Number(row.priority)) ? Number(row.priority) : 100,
    scopeAccountId: row.scope_account_id ?? undefined,
    setCategoryId: row.set_category_id ?? undefined,
    setPayeeId: row.set_payee_id ?? undefined,
    setStatus: normalizeImportRuleStatus(row.set_status),
    workspaceId: row.workspace_id
  };
}

export function normalizeImportRuleMatchField(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "");
  return importRuleMatchFieldOptions.some((option) => option.id === raw)
    ? (raw as ImportRuleMatchField)
    : "description";
}

export function normalizeImportRuleMatchType(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "");
  return importRuleMatchTypeOptions.some((option) => option.id === raw)
    ? (raw as ImportRuleMatchType)
    : "contains";
}

export function normalizeImportRuleStatus(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "");
  return importRuleStatusOptions.some((option) => option.id === raw)
    ? (raw as ImportRuleStatusMode)
    : "keep";
}

export function applyImportRule({
  accountId,
  defaultCategoryId,
  defaultPayeeId,
  defaultStatus,
  row,
  rules
}: {
  accountId: string;
  defaultCategoryId: string | null;
  defaultPayeeId: string | null;
  defaultStatus: "pending" | "posted";
  row: ParsedImportRow;
  rules: ImportRule[];
}) {
  const normalizedDescription = normalizeLookupText(row.description);
  const normalizedPayee = normalizeLookupText(row.payeeName ?? "");
  const orderedRules = [...rules]
    .filter((rule) => rule.isActive)
    .sort((left, right) => left.priority - right.priority);

  for (const rule of orderedRules) {
    if (rule.scopeAccountId && rule.scopeAccountId !== accountId) {
      continue;
    }

    const haystack = rule.matchField === "payee" ? normalizedPayee : normalizedDescription;
    const needle = normalizeLookupText(rule.pattern);

    if (!needle || !haystack) {
      continue;
    }

    if (!isRuleMatch(rule.matchType, haystack, needle)) {
      continue;
    }

    return {
      categoryId: rule.setCategoryId ?? defaultCategoryId,
      matchedRuleId: rule.id,
      matchedRuleName: rule.name,
      payeeId: rule.setPayeeId ?? defaultPayeeId,
      status: rule.setStatus === "keep" ? defaultStatus : rule.setStatus
    };
  }

  return {
    categoryId: defaultCategoryId,
    matchedRuleId: null,
    matchedRuleName: null,
    payeeId: defaultPayeeId,
    status: defaultStatus
  };
}

function isRuleMatch(type: ImportRuleMatchType, haystack: string, needle: string) {
  if (type === "equals") {
    return haystack === needle;
  }

  if (type === "starts_with") {
    return haystack.startsWith(needle);
  }

  return haystack.includes(needle);
}
