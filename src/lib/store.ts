import type {
  Product,
  Category,
  Order,
  User,
  CartItem,
  Banner,
  MediaItem,
} from "./types";
import {
  products as seedProducts,
  categories as seedCategories,
  seedOrders,
  seedUsers,
  seedBanners,
} from "./data";
import {
  api,
  ApiError,
  getOfflineSession,
  getToken,
  getUserToken,
  setOfflineSession,
  setToken,
  setUserToken,
  type BannerInput,
  type CategoryInput,
  type OrderInput,
  type ProductInput,
  type UserInput,
} from "./api";

type Listener = () => void;
type Mode = "online" | "offline";

const OFFLINE_EMAIL = "tanjinairin62@gmail.com";
const OFFLINE_PASSWORD = "tanjina1234";

const OFFLINE_ADMIN: User = {
  id: "offline-admin",
  name: "Tanjina Irin",
  email: OFFLINE_EMAIL,
  role: "admin",
  status: "active",
  orderCount: 0,
  totalSpent: 0,
  createdAt: "2025-01-01",
  lastLogin: new Date().toISOString().slice(0, 10),
};

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function nextOrderNumber(orders: Order[]) {
  const highest = orders.reduce((max, order) => {
    const parsed = Number.parseInt(order.orderNumber.replace(/\D/g, ""), 10);
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
  }, 1000);
  return `ORD-${highest + 1}`;
}

function createStore() {
  const state = {
    products: [...seedProducts] as Product[],
    categories: [...seedCategories] as Category[],
    orders: [...seedOrders] as Order[],
    users: [...seedUsers] as User[],
    banners: [...seedBanners] as Banner[],
    media: [] as MediaItem[],
    customerOrders: [] as Order[],
    cart: [] as CartItem[],
    cartOpen: false as boolean,
    mode: "offline" as Mode,
    apiReachable: false,
    ready: false,
    authReady: false,
    userAuthReady: false,
    adminUser: null as User | null,
    user: null as User | null,
  };

  const listeners = new Set<Listener>();
  const subscribe = (fn: Listener) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };
  const notify = () => listeners.forEach((listener) => listener());

  let version = 0;
  const getVersion = () => version;
  const bump = () => {
    version++;
    notify();
  };

  let bootstrapPromise: Promise<void> | null = null;
  let authPromise: Promise<User | null> | null = null;
  let userAuthPromise: Promise<User | null> | null = null;

  const isLive = () => state.mode === "online" && state.apiReachable && Boolean(getToken());
  const isCustomerLive = () =>
    state.mode === "online" && state.apiReachable && Boolean(getUserToken());

  async function refreshAdminData() {
    if (!state.apiReachable || !getToken()) return;
    const [orders, users, media] = await Promise.all([
      api.admin.orders.list({ limit: 200 }),
      api.admin.users.list(),
      api.admin.media.list(),
    ]);
    state.orders = orders.items;
    state.users = users;
    state.media = media;
    bump();
  }

  async function refreshCustomerOrders() {
    if (!state.apiReachable || !getUserToken()) {
      state.customerOrders = [];
      return;
    }
    const result = await api.account.orders();
    state.customerOrders = result.items;
    bump();
  }

  async function bootstrap() {
    if (state.ready) return Promise.resolve();
    if (bootstrapPromise) return bootstrapPromise;

    bootstrapPromise = (async () => {
      try {
        const data = await api.bootstrap();
        state.products = data.products;
        state.categories = data.categories;
        state.banners = data.banners;
        state.apiReachable = true;
        state.mode = "online";
      } catch (error) {
        state.products = [...seedProducts];
        state.categories = [...seedCategories];
        state.banners = [...seedBanners];
        state.apiReachable = false;
        state.mode = "offline";
        console.warn("[store] API unavailable, using local demo data:", messageOf(error));
      } finally {
        state.ready = true;
        bootstrapPromise = null;
        bump();
      }

      await Promise.all([restoreSession(), restoreUserSession()]);
    })();

    return bootstrapPromise;
  }

  async function restoreSession(): Promise<User | null> {
    if (authPromise) return authPromise;

    authPromise = (async () => {
      try {
        if (getToken()) {
          try {
            const { user } = await api.me();
            if (user.role !== "admin") {
              setToken(null);
              state.adminUser = null;
            } else {
              state.adminUser = user;
              state.mode = "online";
              state.apiReachable = true;
              await refreshAdminData();
            }
            state.authReady = true;
            return state.adminUser;
          } catch (error) {
            if (!(error instanceof ApiError && error.offline)) {
              setToken(null);
              state.adminUser = null;
            }
          }
        }

        if (getOfflineSession()) {
          state.adminUser = OFFLINE_ADMIN;
          if (state.orders.length === 0) state.orders = [...seedOrders];
          if (state.users.length === 0) state.users = [...seedUsers];
        }

        state.authReady = true;
        return state.adminUser;
      } finally {
        authPromise = null;
        bump();
      }
    })();

    return authPromise;
  }

  async function restoreUserSession(): Promise<User | null> {
    if (userAuthPromise) return userAuthPromise;

    userAuthPromise = (async () => {
      try {
        if (getUserToken()) {
          try {
            const { user } = await api.customerMe();
            state.user = user;
            await refreshCustomerOrders();
          } catch (error) {
            if (!(error instanceof ApiError && error.offline)) {
              setUserToken(null);
              state.user = null;
              state.customerOrders = [];
            }
          }
        }
        state.userAuthReady = true;
        return state.user;
      } finally {
        userAuthPromise = null;
        bump();
      }
    })();

    return userAuthPromise;
  }

  async function login(email: string, password: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const result = await api.adminLogin(normalizedEmail, password);
      if (result.user.role !== "admin") {
        throw new ApiError("This account does not have admin access.", 403);
      }
      setToken(result.token);
      setOfflineSession(false);
      state.mode = "online";
      state.apiReachable = true;
      state.adminUser = result.user;
      state.authReady = true;
      await refreshAdminData();
      bump();
      return result.user;
    } catch (error) {
      if (error instanceof ApiError && error.offline) {
        if (normalizedEmail === OFFLINE_EMAIL && password === OFFLINE_PASSWORD) {
          setToken(null);
          setOfflineSession(true);
          state.mode = "offline";
          state.apiReachable = false;
          state.adminUser = OFFLINE_ADMIN;
          state.authReady = true;
          if (state.orders.length === 0) state.orders = [...seedOrders];
          if (state.users.length === 0) state.users = [...seedUsers];
          bump();
          return OFFLINE_ADMIN;
        }
        throw new ApiError("Invalid email or password.", 401);
      }
      throw error;
    }
  }

  function logout() {
    const hadOnlineSession = Boolean(getToken());
    setToken(null);
    setOfflineSession(false);
    state.adminUser = null;
    state.authReady = true;
    bump();
    if (hadOnlineSession) {
      void api.logout().catch(() => undefined);
    }
  }

  async function customerLogin(email: string, password: string): Promise<User> {
    const result = await api.login(email.trim().toLowerCase(), password);
    if (result.user.role !== "customer") {
      throw new ApiError("Please use the admin sign-in page for admin accounts.", 403);
    }
    setUserToken(result.token);
    state.user = result.user;
    state.userAuthReady = true;
    state.mode = "online";
    state.apiReachable = true;
    await refreshCustomerOrders();
    bump();
    return result.user;
  }

  async function register(name: string, email: string, password: string): Promise<User> {
    const result = await api.register(name.trim(), email.trim().toLowerCase(), password);
    setUserToken(result.token);
    state.user = result.user;
    state.userAuthReady = true;
    state.mode = "online";
    state.apiReachable = true;
    state.customerOrders = [];
    bump();
    return result.user;
  }

  function customerLogout() {
    setUserToken(null);
    state.user = null;
    state.customerOrders = [];
    state.userAuthReady = true;
    bump();
  }

  return {
    state,
    subscribe,
    getVersion,

    // ------------------------------------------------------------------ readiness
    get ready() {
      return state.ready;
    },
    get authReady() {
      return state.authReady;
    },
    get userAuthReady() {
      return state.userAuthReady;
    },
    get adminUser() {
      return state.adminUser;
    },
    get user() {
      return state.user;
    },
    get mode() {
      return state.mode;
    },
    get apiReachable() {
      return state.apiReachable;
    },
    get isAuthenticated() {
      return Boolean(state.adminUser);
    },
    bootstrap,
    restoreSession,
    restoreUserSession,
    login,
    logout,
    refreshAdminData,
    customerLogin,
    register,
    customerLogout,
    refreshCustomerOrders,

    // --------------------------------------------------------------------- getters
    get products() {
      return state.products;
    },
    get categories() {
      return state.categories;
    },
    get orders() {
      return state.orders;
    },
    get myOrders() {
      return state.customerOrders;
    },
    get users() {
      return state.users;
    },
    get customers() {
      return state.users.filter((user) => user.role === "customer");
    },
    get admins() {
      return state.users.filter((user) => user.role === "admin");
    },
    get banners() {
      return state.banners;
    },
    get media() {
      return state.media;
    },
    get activeBanners() {
      return [...state.banners].filter((banner) => banner.active).sort((a, b) => a.order - b.order);
    },
    get cart() {
      return state.cart;
    },
    get cartOpen() {
      return state.cartOpen;
    },

    // ------------------------------------------------------------------------ cart
    openCart() {
      state.cartOpen = true;
      bump();
    },
    closeCart() {
      state.cartOpen = false;
      bump();
    },
    addToCart(product: Product, quantity = 1) {
      const existing = state.cart.find((item) => item.productId === product.id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        state.cart.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity,
          slug: product.slug,
        });
      }
      bump();
    },
    removeFromCart(productId: string) {
      state.cart = state.cart.filter((item) => item.productId !== productId);
      bump();
    },
    updateQuantity(productId: string, quantity: number) {
      const item = state.cart.find((cartItem) => cartItem.productId === productId);
      if (!item) return;
      if (quantity <= 0) {
        state.cart = state.cart.filter((cartItem) => cartItem.productId !== productId);
      } else {
        item.quantity = quantity;
      }
      bump();
    },
    clearCart() {
      state.cart = [];
      bump();
    },
    get cartCount() {
      return state.cart.reduce((sum, item) => sum + item.quantity, 0);
    },
    get cartTotal() {
      return state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    },

    // -------------------------------------------------------------------- products
    getProduct(slug: string) {
      return state.products.find((product) => product.slug === slug);
    },
    getProductById(id: string) {
      return state.products.find((product) => product.id === id);
    },
    async addProduct(input: ProductInput) {
      if (isLive()) {
        const created = await api.admin.products.create(input);
        state.products.unshift(created);
        bump();
        return created;
      }

      const product: Product = {
        ...input,
        id: `p${Date.now()}`,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      state.products.unshift(product);
      bump();
      return product;
    },
    async updateProduct(id: string, updates: Partial<ProductInput>) {
      if (isLive()) {
        const updated = await api.admin.products.update(id, updates);
        const index = state.products.findIndex((product) => product.id === id);
        if (index !== -1) state.products[index] = updated;
        bump();
        return updated;
      }

      const product = state.products.find((item) => item.id === id);
      if (product) {
        Object.assign(product, updates);
        bump();
      }
      return product;
    },
    async deleteProduct(id: string) {
      if (isLive()) {
        await api.admin.products.remove(id);
      }
      state.products = state.products.filter((product) => product.id !== id);
      bump();
    },

    // ---------------------------------------------------------------------- orders
    async createOrder(input: OrderInput) {
      if (state.mode === "online" && state.apiReachable) {
        const created = await api.createOrder({
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          shippingAddress: input.shippingAddress,
          city: input.city,
          zipCode: input.zipCode,
          ...(input.notes ? { notes: input.notes } : {}),
          items: input.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        });

        state.orders.unshift(created);
        if (state.user && state.user.email.toLowerCase() === created.customerEmail.toLowerCase()) {
          state.customerOrders.unshift(created);
        }
        for (const item of created.items) {
          const product = state.products.find((candidate) => candidate.id === item.productId);
          if (product) product.stock = Math.max(0, product.stock - item.quantity);
        }
        bump();
        return created;
      }

      const order: Order = {
        ...input,
        id: `o${Date.now()}`,
        orderNumber: nextOrderNumber(state.orders),
        paymentStatus: "unpaid",
        createdAt: new Date().toISOString().slice(0, 10),
      };
      state.orders.unshift(order);
      if (state.user && state.user.email.toLowerCase() === order.customerEmail.toLowerCase()) {
        state.customerOrders.unshift(order);
      }
      for (const item of order.items) {
        const product = state.products.find((candidate) => candidate.id === item.productId);
        if (product) product.stock = Math.max(0, product.stock - item.quantity);
      }
      bump();
      return order;
    },
    async updateOrderStatus(id: string, status: Order["status"]) {
      if (isLive()) {
        const updated = await api.admin.orders.updateStatus(id, status);
        const index = state.orders.findIndex((order) => order.id === id);
        if (index !== -1) state.orders[index] = updated;
        bump();
        return updated;
      }

      const order = state.orders.find((item) => item.id === id);
      if (order) {
        order.status = status;
        order.paymentStatus = status === "delivered" ? "paid" : "unpaid";
        bump();
        return order;
      }
      return null;
    },

    // ----------------------------------------------------------------------- users
    async addUser(input: UserInput) {
      if (isLive()) {
        const created = await api.admin.users.create(input);
        state.users.unshift(created);
        bump();
        return created;
      }

      const { password, ...rest } = input;
      void password;
      const user: User = {
        ...rest,
        id: `u${Date.now()}`,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      state.users.unshift(user);
      bump();
      return user;
    },
    async updateUser(id: string, updates: Partial<UserInput>) {
      if (isLive()) {
        const updated = await api.admin.users.update(id, updates);
        const index = state.users.findIndex((user) => user.id === id);
        if (index !== -1) state.users[index] = updated;
        if (state.adminUser?.id === id) state.adminUser = updated;
        bump();
        return updated;
      }

      const user = state.users.find((item) => item.id === id);
      if (user) {
        const { password, ...rest } = updates;
        void password;
        Object.assign(user, rest);
        if (state.adminUser?.id === id) state.adminUser = { ...state.adminUser, ...rest };
        bump();
      }
      return user;
    },
    async deleteUser(id: string) {
      if (isLive()) {
        await api.admin.users.remove(id);
      }
      state.users = state.users.filter((user) => user.id !== id);
      bump();
    },

    // ------------------------------------------------------------------ categories
    async addCategory(input: CategoryInput) {
      if (isLive()) {
        const created = await api.admin.categories.create(input);
        state.categories.push(created);
        bump();
        return created;
      }

      const category: Category = {
        ...input,
        id: `c${Date.now()}`,
        productCount: 0,
      };
      state.categories.push(category);
      bump();
      return category;
    },
    async updateCategory(id: string, updates: Partial<CategoryInput>) {
      if (isLive()) {
        const updated = await api.admin.categories.update(id, updates);
        const index = state.categories.findIndex((category) => category.id === id);
        if (index !== -1) state.categories[index] = updated;
        bump();
        return updated;
      }

      const category = state.categories.find((item) => item.id === id);
      if (category) {
        Object.assign(category, updates);
        bump();
      }
      return category;
    },
    async deleteCategory(id: string) {
      if (isLive()) {
        await api.admin.categories.remove(id);
      }
      const category = state.categories.find((item) => item.id === id);
      state.categories = state.categories.filter((item) => item.id !== id);
      if (category) {
        state.products = state.products.map((product) =>
          product.category === category.slug ? { ...product, category: "" } : product,
        );
      }
      bump();
    },

    // --------------------------------------------------------------------- banners
    async addBanner(input: BannerInput) {
      if (isLive()) {
        const created = await api.admin.banners.create(input);
        state.banners.push(created);
        bump();
        return created.id;
      }

      const id = `b${Date.now()}`;
      state.banners.push({ ...input, id });
      bump();
      return id;
    },
    async updateBanner(id: string, updates: Partial<BannerInput>) {
      if (isLive()) {
        const updated = await api.admin.banners.update(id, updates);
        const index = state.banners.findIndex((banner) => banner.id === id);
        if (index !== -1) state.banners[index] = updated;
        bump();
        return updated;
      }

      const banner = state.banners.find((item) => item.id === id);
      if (banner) {
        Object.assign(banner, updates);
        bump();
      }
      return banner;
    },
    async deleteBanner(id: string) {
      if (isLive()) {
        await api.admin.banners.remove(id);
      }
      state.banners = state.banners.filter((banner) => banner.id !== id);
      bump();
    },

    // ----------------------------------------------------------------------- media
    async addMedia(input: { name: string; dataUrl: string }) {
      if (isLive()) {
        const created = await api.admin.media.create(input);
        state.media.unshift(created);
        bump();
        return created;
      }

      const item: MediaItem = {
        id: `m${Date.now()}`,
        name: input.name,
        mimeType: input.dataUrl.slice(5, input.dataUrl.indexOf(";")),
        size: Math.floor((input.dataUrl.length * 3) / 4),
        dataUrl: input.dataUrl,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      state.media.unshift(item);
      bump();
      return item;
    },
    async deleteMedia(id: string) {
      if (isLive()) {
        await api.admin.media.remove(id);
      }
      state.media = state.media.filter((item) => item.id !== id);
      bump();
    },

    // ----------------------------------------------------------------------- stats
    get totalRevenue() {
      return state.orders
        .filter((order) => order.status !== "cancelled")
        .reduce((sum, order) => sum + order.total, 0);
    },
    get totalOrders() {
      return state.orders.length;
    },
    get totalProducts() {
      return state.products.length;
    },
    get totalUsers() {
      return state.users.length;
    },
    get totalCustomers() {
      return state.users.filter((user) => user.role === "customer").length;
    },
    get lowStockProducts() {
      return state.products.filter((product) => product.stock < 20);
    },
  };
}

export const store = createStore();
