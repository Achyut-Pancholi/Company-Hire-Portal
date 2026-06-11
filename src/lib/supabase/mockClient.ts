// Server-only mock database client (used when Supabase is not configured)

function readDb() {
  try {
    if (typeof window === 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs') as typeof import('fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path') as typeof import('path');
      const MOCK_DB_PATH = path.join(process.cwd(), 'mock-db.json');
      if (fs.existsSync(MOCK_DB_PATH)) {
        const content = fs.readFileSync(MOCK_DB_PATH, 'utf8');
        return JSON.parse(content);
      }
    }
  } catch (e) {
    console.error('[mock-db] Error reading database:', e);
  }
  return { jobs: [], candidates: [], interviews: [], questions_bank: [], email_settings: [], mcq_questions_bank: [] };
}

function writeDb(data: any) {
  try {
    if (typeof window === 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs') as typeof import('fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path') as typeof import('path');
      const MOCK_DB_PATH = path.join(process.cwd(), 'mock-db.json');
      fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    }
  } catch (e) {
    console.error('[mock-db] Error writing database:', e);
  }
}

class QueryBuilder {
  private tableName: string;
  private data: any[];
  private currentQuery: any[];
  private isSingle = false;

  constructor(tableName: string) {
    this.tableName = tableName;
    const db = readDb();
    this.data = db[tableName] || [];
    this.currentQuery = [...this.data];
  }

  select(fields?: string) {
    // Basic select, currently does not filter fields but returns full objects
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    const asc = options?.ascending !== false;
    this.currentQuery.sort((a, b) => {
      const valA = a[field];
      const valB = b[field];
      if (valA < valB) return asc ? -1 : 1;
      if (valA > valB) return asc ? 1 : -1;
      return 0;
    });
    return this;
  }

  eq(field: string, value: any) {
    this.currentQuery = this.currentQuery.filter((item) => item[field] === value);
    return this;
  }

  match(matchObj: Record<string, any>) {
    this.currentQuery = this.currentQuery.filter((item) => {
      return Object.entries(matchObj).every(([key, value]) => item[key] === value);
    });
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  insert(rowData: any) {
    const db = readDb();
    const table = db[this.tableName] || [];
    
    // Add default fields
    const newRecord = {
      id: rowData.id || `${this.tableName.slice(0, -1)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString(),
      ...rowData,
    };
    
    table.push(newRecord);
    db[this.tableName] = table;
    writeDb(db);

    this.currentQuery = [newRecord];
    return this;
  }

  update(updates: any) {
    const db = readDb();
    const table = db[this.tableName] || [];
    
    // We update all matched items in current query
    const matchedIds = this.currentQuery.map((item) => item.id);
    const updatedRecords: any[] = [];

    const updatedTable = table.map((item: any) => {
      if (matchedIds.includes(item.id)) {
        const updated = { ...item, ...updates };
        updatedRecords.push(updated);
        return updated;
      }
      return item;
    });

    db[this.tableName] = updatedTable;
    writeDb(db);

    this.currentQuery = updatedRecords;
    return this;
  }

  delete() {
    const db = readDb();
    const table = db[this.tableName] || [];
    
    const matchedIds = this.currentQuery.map((item) => item.id);
    const remainingTable = table.filter((item: any) => !matchedIds.includes(item.id));

    db[this.tableName] = remainingTable;
    writeDb(db);

    return this;
  }

  // Thenable trigger to support await on queries directly
  async then(resolve: any, reject: any) {
    try {
      const resultData = this.isSingle ? this.currentQuery[0] : this.currentQuery;
      resolve({ data: resultData, error: null });
    } catch (e) {
      reject({ data: null, error: e });
    }
  }
}

export function getMockSupabaseClient() {
  return {
    from(tableName: string) {
      return new QueryBuilder(tableName);
    },
    auth: {
      async getUser() {
        return { data: { user: { email: "admin@elasticrew.com" } }, error: null };
      },
      async signOut() {
        return { error: null };
      },
      async signInWithPassword() {
        return { data: { user: { email: "admin@elasticrew.com" } }, error: null };
      }
    }
  };
}
