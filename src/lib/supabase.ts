import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rcdshlqlypmykrvrjmpd.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjZHNobHFseXBteWtydnJqbXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzMTM0NjQsImV4cCI6MjA1Nzg4OTQ2NH0.lMi-BM9scyVMlAuHgreccvO0x8QRzjFEcs-c8n1-VJk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to convert D1 database queries to Supabase format
export async function executeQuery(query, params = []) {
  // Replace ? placeholders with $1, $2, etc.
  let supabaseQuery = query.replace(/\?/g, (_, i) => `$${i + 1}`);
  
  // Handle different query types
  if (supabaseQuery.trim().toUpperCase().startsWith('SELECT')) {
    const { data, error } = await supabase.rpc('execute_query', { 
      query_text: supabaseQuery, 
      params: params 
    });
    
    if (error) throw error;
    return { results: data || [] };
  } 
  else if (supabaseQuery.trim().toUpperCase().startsWith('INSERT')) {
    // Extract table name from INSERT query
    const tableMatch = supabaseQuery.match(/INSERT\s+INTO\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1] : null;
    
    if (!table) throw new Error('Could not determine table name from INSERT query');
    
    // Extract column names and values
    const columnsMatch = supabaseQuery.match(/\(([^)]+)\)\s+VALUES\s+\(([^)]+)\)/i);
    if (!columnsMatch) throw new Error('Could not parse INSERT query format');
    
    const columns = columnsMatch[1].split(',').map(col => col.trim());
    
    // Create object for insertion
    const insertData = {};
    columns.forEach((col, index) => {
      insertData[col] = params[index];
    });
    
    const { data, error } = await supabase
      .from(table)
      .insert(insertData)
      .select();
    
    if (error) throw error;
    return { results: data || [] };
  }
  else if (supabaseQuery.trim().toUpperCase().startsWith('UPDATE')) {
    // Extract table name from UPDATE query
    const tableMatch = supabaseQuery.match(/UPDATE\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1] : null;
    
    if (!table) throw new Error('Could not determine table name from UPDATE query');
    
    // Extract SET clause and WHERE clause
    const setMatch = supabaseQuery.match(/SET\s+([^WHERE]+)(?:WHERE\s+(.+))?/i);
    if (!setMatch) throw new Error('Could not parse UPDATE query format');
    
    const setClauses = setMatch[1].split(',').map(clause => clause.trim());
    const whereClause = setMatch[2] ? setMatch[2].trim() : null;
    
    // Create object for update
    const updateData = {};
    let paramIndex = 0;
    setClauses.forEach(clause => {
      const [column] = clause.split('=');
      updateData[column.trim()] = params[paramIndex++];
    });
    
    let query = supabase.from(table).update(updateData);
    
    // Add WHERE conditions if present
    if (whereClause) {
      // This is simplified - in a real implementation you'd need to parse the WHERE clause
      // and convert it to Supabase filter format
      const whereParams = params.slice(paramIndex);
      query = query.match(whereClause, whereParams);
    }
    
    const { data, error } = await query.select();
    
    if (error) throw error;
    return { results: data || [] };
  }
  else if (supabaseQuery.trim().toUpperCase().startsWith('DELETE')) {
    // Extract table name from DELETE query
    const tableMatch = supabaseQuery.match(/DELETE\s+FROM\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1] : null;
    
    if (!table) throw new Error('Could not determine table name from DELETE query');
    
    // Extract WHERE clause
    const whereMatch = supabaseQuery.match(/WHERE\s+(.+)/i);
    const whereClause = whereMatch ? whereMatch[1].trim() : null;
    
    let query = supabase.from(table).delete();
    
    // Add WHERE conditions if present
    if (whereClause) {
      // This is simplified - in a real implementation you'd need to parse the WHERE clause
      // and convert it to Supabase filter format
      query = query.match(whereClause, params);
    }
    
    const { data, error } = await query.select();
    
    if (error) throw error;
    return { results: data || [] };
  }
  
  throw new Error(`Unsupported query type: ${supabaseQuery}`);
}
