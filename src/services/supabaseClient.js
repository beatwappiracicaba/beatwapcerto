
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
  rpc() {
    console.warn('supabase.rpc is not supported; migrate to backend API');
    return Promise.resolve({ data: null, error: null });
  },
  channel() {
    return {
      on() { return this; },
      subscribe(callback) {
        if (callback) callback('SUBSCRIBED');
        return this;
      }
    };
  },
  removeChannel() {},
  from() {
    console.warn('supabase.from is not supported; migrate to backend API');
    const chain = {
      _rows: [],
      _warned: false,
      _touch() {
        if (!this._warned) {
          console.warn('Using supabase stub. Replace with backend API.');
          this._warned = true;
        }
        return this;
      },
      select() { return this._touch(); },
      insert() { return this._touch(); },
      update() { return this._touch(); },
      upsert() { return this._touch(); },
      delete() { return this._touch(); },
      eq() { return this._touch(); },
      contains() { return this._touch(); },
      order() { return { data: this._rows, error: null }; },
      limit() { return this; },
      maybeSingle() { return { data: null, error: null }; },
      single() { return { data: null, error: null }; }
    };
    return chain;
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
