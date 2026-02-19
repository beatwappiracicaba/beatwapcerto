
export const supabase = {
  auth: {
    async getSession() {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      return { data: { session: token ? { access_token: token, user: user ? JSON.parse(user) : null } : null } };
    },
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe() {} } } };
    },
    async signOut() {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    async updateUser() {
      return { data: {}, error: null };
    }
  },
  from() {
    console.warn('supabase.from is not supported; migrate to backend API');
    return {
      select() { return { data: [], error: null }; },
      insert() { return { data: null, error: null }; },
      update() { return { data: null, error: null }; },
      upsert() { return { data: null, error: null }; },
      eq() { return this; },
      maybeSingle() { return { data: null, error: null }; },
      single() { return { data: null, error: null }; },
      order() { return this; },
      limit() { return this; }
    };
  },
  storage: {
    from() {
      console.warn('supabase.storage is not supported; migrate to backend storage');
      return {
        upload: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: null } })
      };
    }
  },
  functions: {
    invoke() {
      console.warn('supabase.functions is not supported in migration');
      return { data: null, error: { message: 'Not available' } };
    }
  }
}
