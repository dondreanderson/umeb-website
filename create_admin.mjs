import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://fkhmwddkosjzatwuxmnh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraG13ZGRrb3NqemF0d3V4bW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDEwOTksImV4cCI6MjA5NTgxNzA5OX0.ogtAR9ibm8jeyL-EBqlKUBUI7pUGL_UXzseA8RsmDcA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createAdmin() {
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@umeb.com',
    password: 'umebadminpassword!'
  });
  
  if (error) {
    console.error('Error creating admin:', error.message);
  } else {
    console.log('Admin created successfully:', data.user?.id);
  }
}

createAdmin();
