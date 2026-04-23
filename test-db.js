const { createClient } = require('@supabase/supabase-js');

var SB_URL = 'https://hbnqxpwrlpcpicuhekkl.supabase.co';
var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhibnF4cHdybHBjcGljdWhla2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MjkxMjcsImV4cCI6MjA5MDMwNTEyN30.EYl-RUUB23nDyM5xVB2L3tyEDDAAyiWC-TQA3saPjDE';
var sb = createClient(SB_URL, SB_KEY);

async function test() {
  var { data, error } = await sb.from('profiles').select('*').limit(1);
  if (error) console.error(error);
  else {
    console.log("Columns:", Object.keys(data[0]));
    console.log("Sample:", data[0]);
  }
}

test();
