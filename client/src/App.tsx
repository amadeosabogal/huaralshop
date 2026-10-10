import { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { Store, ShoppingCart, ClipboardList, CreditCard, Settings, Package, DollarSign, Megaphone, Users, Plus, Minus, Trash2, ArrowLeft, Globe, MapPin, X } from 'lucide-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const CartContext = createContext<any>(null);

const AuthModal = () => {
  const { setUser, isAuthModalOpen, setIsAuthModalOpen } = useContext(CartContext);
  const [view, setView] = useState<'login' | 'register'>('login');
  const navigate = useNavigate();

  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [role, setRole] = useState<'cliente' | 'emprendedor'>('cliente');

  if (!isAuthModalOpen) return null;

  const handleDniChange = async (e: any) => {
    const value = e.target.value.replace(/\\D/g, '').slice(0, 8);
    setDni(value);

    if (value.length === 8) {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/auth/reniec/${value}`);
        if (!res.ok) {
          throw new Error('DNI no encontrado');
        }
        const data = await res.json();
        if (data.nombre) {
          setName(data.nombre);
        } else {
          throw new Error('Formato inválido');
        }
        setLoading(false);
      } catch (err) {
        setError('No se pudo encontrar el DNI');
        setLoading(false);
      }
    } else {
      setName('');
      setError('');
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = view === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = view === 'login' 
        ? { dni, password }
        : { dni, password, nombre: name, telefono: phone, rol: role };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error en la autenticación');

      const mappedUser = {
        ...data.user,
        name: data.user.nombre,
        role: data.user.rol
      };

      setUser(mappedUser);
      if (rememberMe) {
        localStorage.setItem('emprendeHuaral_currentUser', JSON.stringify(mappedUser));
      } else {
        localStorage.removeItem('emprendeHuaral_currentUser');
      }
      localStorage.setItem('emprendeHuaral_jwt', data.token);

      setIsAuthModalOpen(false);
      setError('');
      if (mappedUser.role === 'emprendedor') {
        try {
          const storeRes = await fetch('/api/stores/my-store', {
            headers: { 'Authorization': `Bearer ${data.token}` }
          });
          if (storeRes.ok) {
            const storeData = await storeRes.json();
            const storeId = storeData ? storeData.Id : mappedUser.dni;
            navigate(`/store/${storeId}/admin`);
          } else {
            navigate(`/store/${mappedUser.dni}/admin`);
          }
        } catch (e) {
          navigate(`/store/${mappedUser.dni}/admin`);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const mappedUser = {
        ...data.user,
        name: data.user.nombre,
        role: data.user.rol
      };

      setUser(mappedUser);
      if (rememberMe) {
        localStorage.setItem('emprendeHuaral_currentUser', JSON.stringify(mappedUser));
      } else {
        localStorage.removeItem('emprendeHuaral_currentUser');
      }
      localStorage.setItem('emprendeHuaral_jwt', data.token);

      setIsAuthModalOpen(false);
      setError('');
      if (mappedUser.role === 'emprendedor') {
        try {
          const storeRes = await fetch('/api/stores/my-store', {
            headers: { 'Authorization': `Bearer ${data.token}` }
          });
          if (storeRes.ok) {
            const storeData = await storeRes.json();
            const storeId = storeData ? storeData.Id : mappedUser.dni;
            navigate(`/store/${storeId}/admin`);
          } else {
            navigate(`/store/${mappedUser.dni}/admin`);
          }
        } catch (e) {
          navigate(`/store/${mappedUser.dni}/admin`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión con Google');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Falló el inicio de sesión con Google');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-md relative max-h-[95vh] overflow-y-auto">
        <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 text-muted hover:text-text p-2 rounded-full hover:bg-black/5 transition-colors">
          <X size={24} />
        </button>
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Huaral Shop" className="h-16 mx-auto mb-4 object-contain" />
          <h1 className="text-3xl font-black mb-2 text-primary">{view === 'login' ? 'Ingresar' : 'Regístrate'}</h1>
          <p className="text-muted">{view === 'login' ? 'Accede a tu cuenta usando tu DNI' : 'Crea tu cuenta con tu DNI'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-text mb-2">Número de DNI</label>
            <input
              type="text"
              value={dni}
              onChange={handleDniChange}
              placeholder="Ej. 12345678"
              className="w-full p-4 bg-primary/5 border border-primary/20 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-lg font-medium tracking-widest text-text"
              required
            />
            {loading && <p className="text-sm text-muted mt-2 flex items-center gap-2">Consultando a RENIEC...</p>}
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            {name && <p className="text-sm text-primary font-bold mt-2">¡Hola, {name}!</p>}
          </div>

          {view === 'register' && (
            <>
              <div>
                <label className="block text-sm font-bold text-text mb-2">Celular</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="Ej. 987654321"
                  className="w-full p-4 bg-primary/5 border border-primary/20 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-lg text-text"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-text mb-2">¿Cómo usarás la app?</label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all ${role === 'cliente' ? 'border-primary bg-primary/10' : 'border-border bg-surface hover:bg-black/5'}`}>
                    <input 
                      type="radio" 
                      name="role" 
                      value="cliente" 
                      checked={role === 'cliente'} 
                      onChange={(e) => setRole(e.target.value as any)} 
                      className="sr-only" 
                    />
                    <ShoppingCart size={24} className={role === 'cliente' ? 'text-primary' : 'text-muted'} />
                    <span className={`font-bold ${role === 'cliente' ? 'text-primary' : 'text-muted'}`}>Quiero Comprar</span>
                  </label>
                  
                  <label className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all ${role === 'emprendedor' ? 'border-primary bg-primary/10' : 'border-border bg-surface hover:bg-black/5'}`}>
                    <input 
                      type="radio" 
                      name="role" 
                      value="emprendedor" 
                      checked={role === 'emprendedor'} 
                      onChange={(e) => setRole(e.target.value as any)} 
                      className="sr-only" 
                    />
                    <Store size={24} className={role === 'emprendedor' ? 'text-primary' : 'text-muted'} />
                    <span className={`font-bold ${role === 'emprendedor' ? 'text-primary' : 'text-muted'}`}>Soy Emprendedor</span>
                  </label>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-bold text-text mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={view === 'login' ? "••••••••" : "Crea una contraseña"}
              className="w-full p-4 bg-primary/5 border border-primary/20 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-lg text-text font-mono"
              required
            />
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input 
              type="checkbox" 
              id="remember" 
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-primary bg-surface border-border rounded focus:ring-primary focus:ring-2"
            />
            <label htmlFor="remember" className="text-sm text-text font-medium cursor-pointer select-none">
              Recordar sesión
            </label>
          </div>

          <button
            type="submit"
            disabled={view === 'login' ? (dni.length !== 8 || !password) : (dni.length !== 8 || !password || phone.length < 9 || !name)}
            className="btn btn-primary w-full font-bold py-4 rounded-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed mt-2 border-0"
          >
            {view === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-muted font-medium">O continúa con</span>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              size="large"
              shape="rectangular"
              text="continue_with"
            />
          </div>
        </div>

        <div className="mt-8 text-center border-t border-border pt-6">
          {view === 'login' ? (
            <p className="text-muted">¿No tienes cuenta? <button type="button" onClick={() => setView('register')} className="text-secondary font-bold hover:underline">Regístrate aquí</button></p>
          ) : (
            <p className="text-muted">¿Ya tienes cuenta? <button type="button" onClick={() => setView('login')} className="text-secondary font-bold hover:underline">Ingresa aquí</button></p>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Client Pages ---
const ClientLayout = () => {
  const { cart, user, setUser, setIsAuthModalOpen } = useContext(CartContext);
  const cartCount = cart.reduce((acc: number, item: any) => acc + item.quantity, 0);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name[0].toUpperCase();
  };

  return (
    <div className="min-h-screen flex-col">
      <nav className="navbar py-4">
        <div className="max-w-7xl w-full mx-auto px-6 md:px-12 lg:px-20 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Huaral Shop" className="h-10 md:h-12 w-auto object-contain" />
          </Link>
          <div className="flex items-center justify-center flex-wrap gap-4 md:gap-8 w-full md:w-auto">
            <Link to="/" className="text-muted hover:text-primary font-medium transition-colors">Inicio</Link>
            <Link to="/cart" className="relative text-muted hover:text-primary font-medium transition-colors flex items-center gap-2">
              <ShoppingCart size={18} /> Carrito
              {cartCount > 0 && <span className="absolute -top-2 -right-4 bg-primary text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center pointer-events-none">{cartCount}</span>}
            </Link>
            {user && <Link to="/orders" className="text-muted hover:text-primary font-medium transition-colors">Mis Pedidos</Link>}
            {user && user.role === 'emprendedor' && (
              <Link to={`/store/${user.storeId || user.dni}/admin`} className="text-muted hover:text-primary font-medium transition-colors">Portal</Link>
            )}
            {user ? (
              <div className="relative">
                <div
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shadow-sm cursor-pointer select-none"
                  title={user.name}
                >
                  {getInitials(user.name)}
                </div>

                {isProfileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-border py-2 z-50 animate-fade-in">
                      <div className="px-4 py-2 border-b border-border mb-2">
                        <p className="text-sm font-bold text-text truncate">{user.name}</p>
                        <p className="text-xs text-muted truncate">{user.dni}</p>
                      </div>
                      <button
                        onClick={() => {
                          setUser(null);
                          localStorage.removeItem('emprendeHuaral_currentUser');
                          setIsProfileMenuOpen(false);
                          navigate('/');
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium transition-colors"
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button onClick={() => setIsAuthModalOpen(true)} className="border border-border text-text hover:border-primary hover:text-primary px-5 py-2 font-medium transition-colors bg-transparent rounded-lg">Ingresar</button>
            )}
          </div>
        </div>
      </nav>
      <main className="flex-1 w-full flex flex-col">
        <Outlet />
      </main>
      <AuthModal />
    </div>
  );
};

const ClientHome = () => {
  const [activeStores, setActiveStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stores')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setActiveStores(data);
        }
      })
      .catch(err => console.error('Error fetching stores:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full bg-background min-h-screen scroll-smooth">
      {/* Hero Section */}
      <section className="relative border-b border-border overflow-hidden min-h-[85vh] flex items-center">
        {/* Background Image without blur */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero_bg.jpg')" }}
        ></div>

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-black/60 to-black/40"></div>

        <div className="max-w-7xl w-full mx-auto px-6 md:px-12 lg:px-20 pt-20 pb-32 relative z-10 flex flex-col items-center text-center">
          <div className="w-full max-w-4xl mx-auto">
            <h1
              className="uppercase text-4xl md:text-6xl lg:text-[5.5rem] font-black mb-10 text-white drop-shadow-2xl tracking-tighter"
              style={{ transform: 'scaleX(1.25)', transformOrigin: 'center', lineHeight: '0.85' }}
            >
              DESCUBRE LO<br />
              MEJOR DE<br />
              <span className="text-primary filter brightness-110">HUARAL SHOP</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-12 leading-relaxed drop-shadow-md max-w-3xl mx-auto">
              Conectamos a emprendedores apasionados con clientes locales. Compra fresco, compra local y ayuda a crecer a tu comunidad en un solo lugar.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
              <a href="#tiendas" className="btn btn-primary px-10 py-5 text-xl font-bold w-full sm:w-auto rounded-2xl shadow-xl shadow-primary/30 hover:scale-105 transition-transform">
                Explorar Tiendas
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stores Section */}
      <section id="tiendas" className="pt-32 pb-40 relative bg-background">
        <div className="max-w-7xl w-full mx-auto px-6 md:px-12 lg:px-20 relative z-10">
          <div className="flex flex-col items-center text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold text-text mb-4">
              Nuestras Tiendas
            </h2>
            <p className="text-muted text-xl">
              Explora los catálogos y haz tus pedidos directamente.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-surface border-2 border-border flex flex-col rounded-none animate-pulse">
                  <div className="w-full h-56 bg-gray-200 border-b-2 border-border"></div>
                  <div className="p-6 flex flex-col items-center w-full">
                    <div className="h-6 bg-gray-200 rounded-md w-3/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded-md w-1/2 mb-8"></div>
                    <div className="h-12 bg-gray-200 rounded-md w-full mt-auto"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : activeStores.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {activeStores.map((store: any) => (
                <div key={store.Id} className="bg-surface border-2 border-border flex flex-col group rounded-none">
                  <div className="relative w-full h-56 flex items-center justify-center border-b-2 border-border overflow-hidden bg-background">
                    {store.LogoUrl ? (
                      <img src={store.LogoUrl} alt={store.Nombre} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 grayscale group-hover:grayscale-0" />
                    ) : (
                      <Store size={64} className="text-muted group-hover:scale-110 transition-transform duration-300" />
                    )}
                  </div>
                  <div className="p-6 flex-1 flex flex-col items-center text-center">
                    <div className="flex-1 w-full flex flex-col items-center">
                      <h3 className="text-2xl font-bold uppercase tracking-tight mb-2 group-hover:text-primary transition-colors text-center break-words">{store.Nombre}</h3>
                      <span className="text-sm font-medium text-muted mb-6">{store.Categoria}</span>
                    </div>
                    <Link to={`/store/${store.Id}`} className="w-full mt-auto text-center bg-primary text-white font-bold py-4 border-2 border-primary hover:bg-transparent hover:text-primary transition-colors">
                      Ver tienda
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center text-center py-20 px-8 md:px-16 bg-surface border-4 border-border mt-8 w-full max-w-4xl mx-auto relative">
              <div className="w-24 h-24 flex items-center justify-center mb-8">
                <img src="/tienda.png" alt="Tienda" className="w-full h-full object-contain" />
              </div>

              <h2 className="text-4xl md:text-6xl font-bold text-text mb-6">
                ¡Próximamente!
              </h2>
              <p className="text-muted text-xl mb-12 max-w-3xl">
                Estamos afiliando los mejores emprendimientos locales. Muy pronto podrás descubrir productos increíbles aquí mismo.
              </p>

            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const ClientOrders = () => {
  const { user } = useContext(CartContext);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetch('/api/orders/my-orders', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('emprendeHuaral_jwt')}` }
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMyOrders(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching my orders:', err);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="container mx-auto px-6 max-w-5xl py-20 text-center">
        <h1 className="text-4xl font-bold mb-4">Mis Pedidos</h1>
        <p className="text-muted text-xl">Inicia sesión para ver tus pedidos.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="container mx-auto px-6 max-w-5xl py-20 text-center text-xl font-bold">Cargando tus pedidos...</div>;
  }

  return (
    <div className="container mx-auto px-6 max-w-5xl animate-fade-in py-16 text-left">
      <h1 className="text-4xl font-bold mb-8 text-text uppercase tracking-tight">Mis Pedidos</h1>

      {myOrders.length === 0 ? (
        <div className="bg-surface p-12 md:p-24 flex flex-col items-center justify-center rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black" style={{ minHeight: '400px' }}>
          <Package size={80} className="text-muted mb-8 opacity-50" />
          <h2 className="text-3xl font-black uppercase mb-4 text-center">Sin Pedidos Aún</h2>
          <p className="text-xl text-muted text-center font-medium">No has realizado ninguna compra todavía.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {myOrders.map((order: any) => (
            <div key={order.id} className="bg-white p-6 md:p-8 border border-border rounded-xl shadow-sm flex flex-col md:flex-row gap-6 justify-between items-start md:items-center transition-shadow hover:shadow-md">
              <div>
                <h3 className="text-2xl font-bold capitalize text-text mb-2">{order.storeName.toLowerCase()}</h3>
                <p className="text-muted font-medium mb-4">Fecha: {new Date(order.date).toLocaleString()}</p>
                <div className="space-y-1 mb-4">
                  {order.items.map((item: any, i: number) => (
                    <p key={i} className="text-text font-medium"><span className="text-primary font-bold">{item.quantity}x</span> {item.name}</p>
                  ))}
                </div>
                <p className="text-xl font-bold">Total: S/ {order.total.toFixed(2)}</p>
              </div>
              <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                <span className={`px-4 py-1.5 rounded-full font-bold text-sm shadow-sm ${order.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                  order.status === 'Preparando' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                    order.status === 'En camino' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      'bg-green-100 text-green-800 border border-green-200'
                  }`}>
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StoreCatalog = () => {
  const { id } = useParams();
  const { addToCart } = useContext(CartContext);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/stores/${id}/products`)
      .then(res => res.json())
      .then(data => {
        setStore(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching store products:', err);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="py-20 text-center font-bold text-xl">Cargando catálogo...</div>;
  if (!store || store.error) return <div className="py-20 text-center font-bold text-xl">Tienda no encontrada</div>;

  const storeName = store.Nombre;
  const products = store.products || [];
  const handleAddToCart = (product: any) => addToCart({ ...product, id: product.Id, storeId: id, storeName, name: product.Nombre, price: product.Precio });

  const decorativeImage = 'https://images.unsplash.com/photo-1544025162-89b4f9d27572?auto=format&fit=crop&q=80&w=600';

  return (
    <div className="w-full bg-[#fcfcfc] text-text min-h-screen py-20 relative overflow-hidden font-sans border-t border-border flex-1">
      {/* Decorative background images */}
      <img src={decorativeImage} className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full object-cover border-[8px] border-dotted border-black/10 opacity-60 pointer-events-none" alt="" />
      <img src={decorativeImage} className="absolute -bottom-32 -left-32 w-[600px] h-[600px] rounded-full object-cover border-[8px] border-dotted border-black/10 opacity-60 pointer-events-none" alt="" />

      <div className="container mx-auto px-6 md:px-12 relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-muted hover:text-primary mb-12 transition-colors">
          <ArrowLeft size={20} /> Volver a tiendas
        </Link>

        <div className="flex flex-col gap-10 max-w-4xl mx-auto">
          {/* Main Content */}
          <div className="w-full flex flex-col gap-10">
            <div>
              <h1 className="text-7xl md:text-9xl font-bold mb-6 uppercase tracking-tighter text-stretch leading-none drop-shadow-md text-text">
                CARTA<br />DIGITAL
              </h1>
              <p className="text-muted text-xl font-medium max-w-sm leading-relaxed">
                Haz clic en cualquier producto o en el botón <span className="font-bold text-primary">+</span> para añadirlo a tu carrito de compras.
              </p>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-20 opacity-50">
                <p className="text-2xl font-bold mb-2">Carta en preparación</p>
                <p>El emprendedor aún no ha agregado productos a su catálogo.</p>
              </div>
            ) : (
              Array.from(new Set(products.map((p: any) => p.Categoria))).map(category => (
                <div key={category as string} className="mb-10">
                  <h3 className="inline-block bg-primary text-white px-4 py-1.5 font-black uppercase tracking-widest text-lg mb-4 shadow-sm">
                    {category as string}
                  </h3>
                  <ul className="space-y-5">
                    {products.filter((p: any) => p.Categoria === category).map((p: any) => (
                      <li key={p.Id} className="flex justify-between items-center group cursor-pointer hover:bg-black/5 p-2 -mx-2 rounded transition-colors">
                        <span className="text-xl md:text-2xl font-medium text-text group-hover:text-primary transition-colors">{p.Nombre}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xl md:text-2xl font-bold text-text">S/ {p.Precio}</span>
                          <button onClick={() => handleAddToCart(p)} className="bg-white text-primary border border-black/5 p-2 rounded-full transition-transform hover:scale-110 active:scale-95 shadow-md hover:shadow-lg ml-2">
                            <Plus size={22} className="stroke-[3px]" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}

            {/* MORE INFO */}
            <div className="mt-12">
              <h4 className="text-text font-bold uppercase tracking-widest text-lg mb-4">MÁS INFORMACIÓN</h4>
              <div className="border border-border p-8 space-y-4 text-base md:text-lg text-muted">
                <p className="flex items-center gap-4"><ClipboardList size={20} className="text-primary" /> 123-456-7890</p>
                <p className="flex items-center gap-4"><Globe size={20} className="text-primary" /> www.emprendehuaral.com</p>
                <p className="flex items-center gap-4"><MapPin size={20} className="text-primary" /> Plaza de Armas, Huaral</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CartView = () => {
  const { cart, setCart, user, setIsAuthModalOpen } = useContext(CartContext);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (showSuccessModal) {
      timeout = setTimeout(() => {
        setShowSuccessModal(false);
        navigate('/orders');
      }, 2500);
    }
    return () => clearTimeout(timeout);
  }, [showSuccessModal, navigate]);

  const updateQuantity = (id: number, storeId: string, delta: number) => {
    setCart((prev: any[]) => prev.map(item => {
      if (item.id === id && item.storeId === storeId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeItem = (id: number, storeId: string) => {
    setCart((prev: any[]) => prev.filter(item => !(item.id === id && item.storeId === storeId)));
  };

  const total = cart.reduce((acc: number, item: any) => acc + (parseFloat(item.price) * item.quantity), 0);

  return (
    <div className="container mx-auto px-6 max-w-5xl animate-fade-in" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
      <h1 className="text-4xl font-bold mb-8">Tu Carrito de Compras</h1>

      {cart.length === 0 ? (
        <div className="bg-white p-12 md:p-24 flex flex-col items-center justify-center rounded-lg shadow-sm border border-border" style={{ minHeight: '400px' }}>
          <ShoppingCart size={80} className="text-muted mb-8 opacity-50" />
          <h2 className="text-3xl font-bold mb-4 text-center">Tu carrito está vacío</h2>
          <p className="text-xl text-muted mb-12 max-w-lg text-center">Parece que aún no has agregado ningún delicioso plato a tu pedido. ¡Anímate a explorar el menú!</p>
          <Link to="/" className="btn btn-primary rounded-full px-10 py-4 font-bold text-lg mt-4">
            Explorar Tiendas
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Items List */}
          <div className="flex-1 bg-white p-6 md:p-8 rounded-lg shadow-sm border border-border">
            <h2 className="text-2xl font-bold mb-6 border-b border-border pb-4">
              Artículos ({cart.reduce((a: number, c: any) => a + c.quantity, 0)})
            </h2>
            <div className="space-y-8">
              {Object.entries(
                cart.reduce((acc: any, item: any) => {
                  const store = item.storeName || 'Emprendimiento Desconocido';
                  if (!acc[store]) acc[store] = [];
                  acc[store].push(item);
                  return acc;
                }, {})
              ).map(([storeName, items]: [string, any]) => (
                <div key={storeName} className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-surface px-6 py-3 border-b border-border flex items-center gap-2">
                    <Store size={18} className="text-primary" />
                    <h3 className="font-bold text-text">{storeName}</h3>
                  </div>
                  <div className="p-6 space-y-6">
                    {items.map((item: any) => (
                      <div key={`${item.storeId}-${item.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border last:border-0 last:pb-0 gap-4 text-left">
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-text">{item.name}</h4>
                          <p className="text-primary font-bold text-lg mt-1">S/ {parseFloat(item.price).toFixed(2)}</p>
                        </div>

                        <div className="flex items-center gap-6 justify-start sm:justify-end">
                          <div className="flex items-center bg-background rounded-full border border-border shadow-sm overflow-hidden">
                            <button onClick={() => updateQuantity(item.id, item.storeId, -1)} className="p-3 hover:bg-black/5 hover:text-primary transition-colors">
                              <Minus size={18} strokeWidth={3} />
                            </button>
                            <span className="w-10 text-center font-bold text-lg">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.storeId, 1)} className="p-3 hover:bg-black/5 hover:text-primary transition-colors">
                              <Plus size={18} strokeWidth={3} />
                            </button>
                          </div>

                          <button onClick={() => removeItem(item.id, item.storeId)} className="text-red-500 p-3 hover:bg-red-50 rounded-full transition-colors" title="Eliminar">
                            <Trash2 size={24} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="w-full lg:w-[400px]">
            <div className="bg-surface p-6 md:p-8 rounded-lg shadow-sm border border-border sticky top-24 text-left">
              <h2 className="text-2xl font-bold mb-6 border-b border-border pb-4">Resumen del Pedido</h2>

              <div className="space-y-4 mb-8 text-lg">
                <div className="flex justify-between text-text">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-bold">S/ {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Costo de envío</span>
                  <span>Calculado en caja</span>
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-border mt-6">
                  <span className="text-xl font-bold">Total a pagar</span>
                  <span className="text-3xl font-black text-primary">S/ {total.toFixed(2)}</span>
                </div>
              </div>

              <button
                disabled={isSubmitting}
                onClick={async () => {
                  if (!user) {
                    setIsAuthModalOpen(true);
                    return;
                  }
                  
                  setIsSubmitting(true);
                  try {
                    const storeGroups = cart.reduce((acc: any, item: any) => {
                      if (!acc[item.storeId]) acc[item.storeId] = { items: [], total: 0 };
                      acc[item.storeId].items.push(item);
                      acc[item.storeId].total += parseFloat(item.price) * item.quantity;
                      return acc;
                    }, {});
                    
                    for (const [storeId, group] of Object.entries(storeGroups)) {
                      await fetch('/api/orders', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('emprendeHuaral_jwt')}`
                        },
                        body: JSON.stringify({
                          tiendaId: storeId,
                          items: (group as any).items,
                          total: (group as any).total
                        })
                      });
                    }
                    
                    setCart([]);
                    setShowSuccessModal(true);
                  } catch (e) {
                    console.error(e);
                    alert("Error al procesar el pedido");
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="w-full btn-secondary font-bold text-xl py-4 rounded-full shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform text-white disabled:opacity-50">
                {isSubmitting ? 'Enviando...' : 'Enviar pedido'}
              </button>

              <Link to="/store/1" className="block text-center mt-6 text-muted hover:text-primary font-medium transition-colors">
                Seguir comprando
              </Link>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white p-8 md:p-12 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-lg w-full text-center relative animate-slide-up rounded-none">
            <button
              onClick={() => {
                setShowSuccessModal(false);
                navigate('/orders');
              }}
              className="absolute top-4 right-4 text-muted hover:text-primary transition-colors"
            >
              <X size={28} strokeWidth={3} />
            </button>
            <img src="/caja.png" alt="Pedido Enviado" className="w-24 h-24 mx-auto mb-6 object-contain" />
            <h2 className="text-4xl font-black tracking-tight mb-4 text-text">¡Pedido enviado!</h2>
            <p className="text-xl font-bold text-text mb-8 leading-relaxed">
              El emprendedor ha recibido tu orden en su dashboard. Prepárate para disfrutar tu pedido.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Admin Pages ---
const AdminLayout = () => {
  const location = useLocation();
  const { id } = useParams();
  const basePath = `/store/${id}/admin`;
  const isActive = (path: string) => location.pathname === path ? 'active' : '';

  return (
    <div className="flex flex-col md:flex-row bg-background min-h-screen">
      <aside className="sidebar flex-col">
        <div className="mb-4 md:mb-8 px-4 flex justify-between items-center">
          <Link to="/">
            <img src="/logo.png" alt="Huaral Shop" className="h-8 md:h-10 w-auto mb-2 md:mb-6 object-contain" />
          </Link>
        </div>
        <nav className="flex-row md:flex-col gap-2 flex flex-wrap md:flex-1">
          <Link to={`${basePath}`} className={`nav-link p-4 flex items-center gap-2 hover:bg-surface ${isActive(basePath)}`}><ClipboardList size={20} /> Pedidos</Link>
          <Link to={`${basePath}/sales`} className={`nav-link p-4 flex items-center gap-2 hover:bg-surface ${isActive(`${basePath}/sales`)}`}><DollarSign size={20} /> Ventas y Caja</Link>
          <Link to={`${basePath}/inventory`} className={`nav-link p-4 flex items-center gap-2 hover:bg-surface ${isActive(`${basePath}/inventory`)}`}><Package size={20} /> Inventario</Link>
          <Link to={`${basePath}/credits`} className={`nav-link p-4 flex items-center gap-2 hover:bg-surface ${isActive(`${basePath}/credits`)}`}><CreditCard size={20} /> Fiados</Link>
          <div className="mt-auto flex flex-col gap-2">
            <Link to={`${basePath}/settings`} className={`nav-link p-4 flex items-center gap-2 hover:bg-surface ${isActive(`${basePath}/settings`)}`}><Settings size={20} /> Configuración</Link>
            <Link to="/" className="nav-link p-4 flex items-center gap-2 hover:bg-surface text-muted hover:text-primary mt-4 border-t border-border pt-6"><ArrowLeft size={20} /> Volver al Inicio</Link>
          </div>
        </nav>
      </aside>
      <main className="main-content flex-1">
        <Outlet />
      </main>
    </div>
  );
};

const AdminDashboard = () => {
  const { id } = useParams();
  const [storeOrders, setStoreOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/orders/store/${id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('emprendeHuaral_jwt')}` }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) setStoreOrders(data);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [id]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('emprendeHuaral_jwt')}`
        },
        body: JSON.stringify({ estado: newStatus })
      });
      setStoreOrders((prev: any[]) => prev.map(o => o.Id === orderId ? { ...o, Estado: newStatus } : o));
    } catch (e) {
      console.error('Error updating status', e);
    }
  };

  if (loading) return <div className="p-8">Cargando pedidos...</div>;

  return (
    <div className="animate-fade-in text-left">
      <h1 className="text-4xl font-bold uppercase tracking-tight mb-8 text-text">Gestión de Pedidos</h1>
      {storeOrders && storeOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {storeOrders.map((order: any, idx: number) => (
            <div key={order.Id || idx} className="bg-white p-6 md:p-8 border border-border shadow-sm rounded-xl flex flex-col hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-6 border-b border-border pb-4">
                <div>
                  <h3 className="text-2xl font-bold uppercase text-text mb-1">Pedido de {order.Cliente}</h3>
                  <p className="text-muted font-medium text-sm">DNI: {order.ClienteDni}</p>
                </div>
                <span className={`px-4 py-1.5 rounded-full font-bold text-sm shadow-sm ${order.Estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                  order.Estado === 'Preparando' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                    order.Estado === 'En camino' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      'bg-green-100 text-green-800 border border-green-200'
                  }`}>
                  {order.Estado}
                </span>
              </div>
              <div className="mb-6 flex-1">
                <p className="text-muted text-sm font-bold mb-4">FECHA: {new Date(order.FechaPedido).toLocaleString()}</p>
                <div className="space-y-3 bg-surface p-4 rounded-lg border border-border">
                  {order.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-base font-medium">
                      <span className="text-text"><span className="text-primary font-bold">{item.Cantidad}x</span> {item.Nombre}</span>
                      <span className="text-text font-bold">S/ {(parseFloat(item.PrecioUnitario) * item.Cantidad).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-border mb-6">
                <span className="font-bold text-xl uppercase tracking-wider">Total</span>
                <span className="font-bold text-primary text-3xl">S/ {order.Total.toFixed(2)}</span>
              </div>
              <div className="mt-auto">
                <p className="text-sm font-bold uppercase mb-2 text-muted">Actualizar Estado:</p>
                <div className="flex flex-wrap gap-2">
                  {['Pendiente', 'Preparando', 'En camino', 'Entregado'].map(s => (
                    <button
                      key={s}
                      onClick={() => updateOrderStatus(order.Id, s)}
                      disabled={order.Estado === s}
                      className={`flex-1 min-w-[100px] py-2 rounded-lg border font-bold text-sm shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${order.Estado === s ? 'bg-primary border-primary text-white' : 'bg-white border-border text-text hover:bg-surface hover:border-gray-300'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel p-8">
          <div className="flex items-center justify-center flex-col py-12 text-muted">
            <ClipboardList size={64} className="mb-4 opacity-50" />
            <p className="text-xl">No hay pedidos recientes</p>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminSales = () => {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [descripcion, setDescripcion] = useState('');

  const fetchSales = () => {
    fetch(`/api/sales/store/${id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('emprendeHuaral_jwt')}` }
    })
    .then(res => res.json())
    .then(d => { setData(d); setLoading(false); })
    .catch(console.error);
  };

  useEffect(() => {
    fetchSales();
  }, [id]);

  const handleManualSale = async (e: any) => {
    e.preventDefault();
    if (!monto) return;
    try {
      await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('emprendeHuaral_jwt')}`
        },
        body: JSON.stringify({ tiendaId: id, monto: parseFloat(monto), metodoPago, descripcion })
      });
      setMonto(''); setDescripcion('');
      fetchSales();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-8">Cargando ventas...</div>;

  const totalManuales = data?.ventasManuales?.reduce((sum: number, v: any) => sum + v.Monto, 0) || 0;
  const totalGeneral = (data?.totalPedidosEntregados || 0) + totalManuales;

  return (
    <div className="animate-fade-in text-left p-8">
      <h1 className="text-4xl font-bold uppercase tracking-tight mb-8 text-text">Gestión de Ventas y Caja</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 border border-border shadow-sm rounded-xl">
          <p className="text-sm font-bold text-muted uppercase tracking-wider mb-2">Total Pedidos App</p>
          <p className="text-3xl font-black text-primary">S/ {(data?.totalPedidosEntregados || 0).toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 border border-border shadow-sm rounded-xl">
          <p className="text-sm font-bold text-muted uppercase tracking-wider mb-2">Total Ventas en Local</p>
          <p className="text-3xl font-black text-primary">S/ {totalManuales.toFixed(2)}</p>
        </div>
        <div className="bg-primary p-6 border border-primary-hover shadow-sm rounded-xl text-white">
          <p className="text-sm font-bold text-white/80 uppercase tracking-wider mb-2">Total Ingresos</p>
          <p className="text-4xl font-black">S/ {totalGeneral.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 border border-border shadow-sm rounded-xl">
          <h2 className="text-2xl font-bold mb-6">Registrar Venta Manual</h2>
          <form onSubmit={handleManualSale} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Monto (S/)</label>
              <input type="number" step="0.10" value={monto} onChange={e => setMonto(e.target.value)} required className="w-full input border border-border rounded-lg p-3" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Método de Pago</label>
              <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} className="w-full input border border-border rounded-lg p-3">
                <option value="Efectivo">Efectivo</option>
                <option value="Yape/Plin">Yape / Plin</option>
                <option value="Tarjeta">Tarjeta</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <input type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)} className="w-full input border border-border rounded-lg p-3" placeholder="Ej. 2 kg Manzanas" />
            </div>
            <button type="submit" className="w-full btn btn-secondary py-3 rounded-xl font-bold text-lg text-white shadow-md hover:scale-[1.02] transition-transform">Registrar Ingreso</button>
          </form>
        </div>

        <div className="bg-white p-6 border border-border shadow-sm rounded-xl overflow-y-auto" style={{ maxHeight: '500px' }}>
          <h2 className="text-2xl font-bold mb-6">Últimas Ventas Manuales</h2>
          {data?.ventasManuales?.length > 0 ? (
            <div className="space-y-4">
              {data.ventasManuales.map((v: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-4 bg-surface rounded-lg border border-border">
                  <div>
                    <p className="font-bold">{v.Descripcion || 'Venta Local'}</p>
                    <p className="text-sm text-muted">{new Date(v.Fecha).toLocaleString()} • {v.MetodoPago}</p>
                  </div>
                  <span className="font-black text-lg text-primary">+S/ {v.Monto.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-center py-8">No hay ventas manuales registradas.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const AdminCredits = () => {
  const { id } = useParams();
  const [credits, setCredits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const fetchCredits = () => {
    fetch(`/api/credits/store/${id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('emprendeHuaral_jwt')}` }
    })
    .then(res => res.json())
    .then(data => { setCredits(data); setLoading(false); })
    .catch(console.error);
  };

  useEffect(() => {
    fetchCredits();
  }, [id]);

  const handleCreate = async (e: any) => {
    e.preventDefault();
    if (!monto || !nombre) return;
    try {
      await fetch('/api/credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('emprendeHuaral_jwt')}`
        },
        body: JSON.stringify({ tiendaId: id, clienteNombre: nombre, clienteDni: dni, monto: parseFloat(monto), descripcion })
      });
      setNombre(''); setDni(''); setMonto(''); setDescripcion('');
      fetchCredits();
    } catch (e) {
      console.error(e);
    }
  };

  const markAsPaid = async (fiadoId: number) => {
    try {
      await fetch(`/api/credits/${fiadoId}/pay`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('emprendeHuaral_jwt')}` }
      });
      fetchCredits();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-8">Cargando fiados...</div>;

  const totalPendiente = credits.filter(c => c.Estado === 'Pendiente').reduce((sum, c) => sum + c.Monto, 0);

  return (
    <div className="animate-fade-in text-left p-8">
      <div className="flex justify-between items-end mb-8">
        <h1 className="text-4xl font-bold uppercase tracking-tight text-text">Gestión de Fiados</h1>
        <div className="text-right">
          <p className="text-sm font-bold text-muted uppercase tracking-wider mb-1">Total por Cobrar</p>
          <p className="text-3xl font-black text-red-500">S/ {totalPendiente.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white p-6 border border-border shadow-sm rounded-xl">
          <h2 className="text-xl font-bold mb-6">Registrar Nuevo Fiado</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre del Cliente</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required className="w-full input border border-border rounded-lg p-3" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">DNI (Opcional)</label>
              <input type="text" value={dni} onChange={e => setDni(e.target.value)} className="w-full input border border-border rounded-lg p-3" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monto (S/)</label>
              <input type="number" step="0.10" value={monto} onChange={e => setMonto(e.target.value)} required className="w-full input border border-border rounded-lg p-3" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción de lo llevado</label>
              <input type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)} className="w-full input border border-border rounded-lg p-3" />
            </div>
            <button type="submit" className="w-full btn btn-primary py-3 rounded-xl font-bold shadow-md hover:scale-[1.02] transition-transform">Registrar Fiado</button>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {credits.map((c: any, i: number) => (
              <div key={i} className={`p-6 border rounded-xl shadow-sm transition-all ${c.Estado === 'Pagado' ? 'bg-green-50 border-green-200 opacity-70' : 'bg-white border-border hover:shadow-md'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{c.ClienteNombre}</h3>
                    {c.ClienteDni && <p className="text-sm text-muted">DNI: {c.ClienteDni}</p>}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.Estado === 'Pagado' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {c.Estado}
                  </span>
                </div>
                <div className="mb-4">
                  <p className="text-sm">{c.Descripcion}</p>
                  <p className="text-xs text-muted mt-1">{new Date(c.Fecha).toLocaleString()}</p>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-black/5">
                  <span className="font-black text-xl">S/ {c.Monto.toFixed(2)}</span>
                  {c.Estado === 'Pendiente' && (
                    <button onClick={() => markAsPaid(c.Id)} className="btn btn-secondary py-2 px-4 rounded-lg text-sm font-bold text-white shadow-md hover:scale-[1.05] transition-transform">
                      Marcar Pagado
                    </button>
                  )}
                </div>
              </div>
            ))}
            {credits.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted border border-dashed border-border rounded-xl">
                No hay fiados registrados.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminSettings = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [category, setCategory] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/stores/my-store', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('emprendeHuaral_jwt')}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data && data.Id) {
        setStore(data);
      }
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const hasStore = !!store;

  const handleLogoChange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    const method = hasStore ? 'PUT' : 'POST';
    const endpoint = hasStore ? `/api/stores/${store.Id}` : '/api/stores';

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('emprendeHuaral_jwt')}`
        },
        body: JSON.stringify({ nombre: storeName, categoria: category, logoUrl: logo })
      });
      if (!res.ok) throw new Error('Error al guardar tienda');
      const data = await res.json();
      setStore(data);
      setIsFormOpen(false);
      
      // Si se acaba de crear, redirigimos a su URL correcta
      if (!hasStore) {
        navigate(`/store/${data.Id}/admin`);
      }
    } catch (err) {
      console.error(err);
      alert("Error guardando la tienda");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Cargando configuración...</div>;

  return (
    <div className="animate-fade-in text-left p-8">
      <h1 className="text-3xl font-bold mb-8">Configuración de Tienda</h1>

      {!hasStore && !isFormOpen ? (
        <div className="glass-panel p-12 text-center max-w-2xl border border-border shadow-sm">
          <Store size={64} className="mx-auto text-muted mb-6 opacity-50" />
          <h2 className="text-2xl font-bold mb-4">Aún no has configurado tu emprendimiento</h2>
          <p className="text-muted mb-8">Para empezar a vender, necesitas configurar los datos básicos de tu tienda para que los clientes puedan encontrarte.</p>
          <button onClick={() => setIsFormOpen(true)} className="btn btn-primary font-bold text-lg px-8 py-4 rounded-xl">
            Iniciar Emprendimiento
          </button>
        </div>
      ) : hasStore && !isFormOpen ? (
        <div className="glass-panel p-8 max-w-2xl border border-border shadow-sm">
          <div className="flex items-center gap-6 mb-8">
            {store.LogoUrl ? (
              <img src={store.LogoUrl} alt="Logo" className="w-24 h-24 object-cover rounded-xl border border-border shadow-sm" />
            ) : (
              <div className="w-24 h-24 bg-surface rounded-xl border border-border flex items-center justify-center">
                <Store size={32} className="text-muted" />
              </div>
            )}
            <div>
              <h2 className="text-3xl font-bold text-primary">{store.Nombre}</h2>
              <span className="inline-block mt-2 bg-secondary/10 text-secondary px-3 py-1 rounded-full font-bold text-sm">
                Categoría: {store.Categoria}
              </span>
            </div>
          </div>
          <button onClick={() => {
            setStoreName(store.Nombre);
            setCategory(store.Categoria || '');
            setLogo(store.LogoUrl || null);
            setIsFormOpen(true);
          }} className="btn btn-outline font-bold px-6 py-3 rounded-xl border border-border hover:bg-surface">Editar Emprendimiento</button>
        </div>
      ) : (
        <div className="glass-panel p-8 max-w-2xl border border-border shadow-sm">
          <h2 className="text-2xl font-bold mb-6">{hasStore ? 'Editar Emprendimiento' : 'Configura tu Emprendimiento'}</h2>
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-text mb-2">Nombre del Emprendimiento</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Ej. Postres Doña María"
                className="w-full p-4 border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-lg bg-surface text-text"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-text mb-2">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-4 border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-lg bg-surface text-text"
                required
              >
                <option value="">Selecciona una categoría...</option>
                <option value="Restaurantes">Restaurantes</option>
                <option value="Ropa y Moda">Ropa y Moda</option>
                <option value="Tecnología">Tecnología</option>
                <option value="Artesanías">Artesanías</option>
                <option value="Postres y Dulces">Postres y Dulces</option>
                <option value="Servicios">Servicios</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-text mb-2">Logo del Emprendimiento</label>
              <div className="flex items-center gap-6">
                {logo ? (
                  <img src={logo} alt="Preview" className="w-20 h-20 object-cover rounded-xl border border-border" />
                ) : (
                  <div className="w-20 h-20 bg-surface rounded-xl border border-border border-dashed flex items-center justify-center">
                    <Store size={24} className="text-muted opacity-50" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  required={!logo && !hasStore}
                />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button type="button" onClick={() => setIsFormOpen(false)} disabled={saving} className="btn btn-outline flex-1 py-4 font-bold rounded-xl border border-border hover:bg-surface">Cancelar</button>
              <button type="submit" disabled={saving} className="btn btn-primary flex-1 py-4 font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-white disabled:opacity-50 border-0">
                {saving ? 'Guardando...' : (hasStore ? 'Guardar Cambios' : 'Iniciar Emprendimiento')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// --- Development Pages ---
const DevelopmentLayout = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path ? 'active' : '';

  return (
    <div className="flex flex-col md:flex-row bg-background min-h-screen">
      <aside className="sidebar flex-col">
        <div className="mb-4 md:mb-8 px-4 flex justify-between items-center">
          <Link to="/">
            <img src="/logo.png" alt="Huaral Shop" className="h-8 md:h-10 w-auto mb-2 md:mb-6 object-contain" />
          </Link>
        </div>
        <nav className="flex-row md:flex-col gap-2 flex flex-wrap md:flex-1">
          <Link to="/development" className={`nav-link p-4 flex items-center gap-2 hover:bg-surface ${isActive('/development')}`}><Users size={20} /> Emprendedores</Link>
          <Link to="/development/ads" className={`nav-link p-4 flex items-center gap-2 hover:bg-surface ${isActive('/development/ads')}`}><Megaphone size={20} /> Publicidad</Link>
          <div className="mt-auto flex flex-col gap-2">
            <Link to="/" className="nav-link p-4 flex items-center gap-2 hover:bg-surface text-muted hover:text-primary mt-4 border-t border-border pt-6"><ArrowLeft size={20} /> Volver al Inicio</Link>
          </div>
        </nav>
      </aside>
      <main className="main-content flex-1">
        <Outlet />
      </main>
    </div>
  );
};

const DevDashboard = () => {
  const [dni, setDni] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    // In a real app we'd fetch users from an admin endpoint. For now we will just show an empty list or fetch from an endpoint if one exists.
    // Let's create an endpoint or just mock this for now, since we only really need registration.
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if(Array.isArray(data)) setUsers(data);
      })
      .catch(e => console.error(e));
  }, []);

  const handleDniChange = async (e: any) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 8);
    setDni(value);

    if (value.length === 8) {
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        const res = await fetch(`/api/auth/reniec/${value}`);
        if (!res.ok) {
          throw new Error('DNI no encontrado');
        }
        const data = await res.json();
        if (data.nombre) {
          setName(data.nombre);
        } else {
          throw new Error('Formato inválido');
        }
        setLoading(false);
      } catch (err) {
        setError('No se pudo encontrar el DNI');
        setLoading(false);
      }
    } else {
      setName('');
      setError('');
      setSuccess('');
    }
  };

  const handleRegister = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni, password, nombre: name, telefono: phone, rol: 'emprendedor' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar');
      
      setSuccess('Emprendedor registrado exitosamente');
      setUsers([...users, { ...data.user, role: 'emprendedor' }]);
      setDni('');
      setName('');
      setPhone('');
      setPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const emprendedores = users.filter((u: any) => u.rol === 'emprendedor' || u.role === 'emprendedor');
  const clientes = users.filter((u: any) => u.rol !== 'emprendedor' && u.role !== 'emprendedor');

  return (
    <div className="animate-fade-in flex flex-col lg:flex-row gap-8 text-left p-8">
      <div className="flex-1 min-w-0">
        <h1 className="text-3xl font-bold mb-8 text-text">Gestión de Usuarios</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="glass-panel p-6 border border-border shadow-sm">
            <h3 className="text-lg text-muted mb-2 font-medium">Total Emprendedores</h3>
            <p className="text-5xl font-bold text-text">{emprendedores.length || 0}</p>
          </div>
          <div className="glass-panel p-6 border border-border shadow-sm bg-gradient-to-br from-secondary/5 to-transparent">
            <h3 className="text-lg text-muted mb-2 font-medium">Total Clientes</h3>
            <p className="text-5xl font-bold text-secondary">{clientes.length || 0}</p>
          </div>
        </div>

        <div className="glass-panel p-8 border border-border shadow-sm">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Store size={24} className="text-primary" /> Todos los Registros</h3>
          {users.length > 0 ? (
            <div className="space-y-4">
              {[...users].reverse().map((u: any, idx: number) => (
                <div key={idx} className="group flex justify-between items-center bg-white p-5 rounded-2xl border border-border/60 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-md hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-inner ${u.rol === 'emprendedor' || u.role === 'emprendedor' ? 'bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/20' : 'bg-gradient-to-br from-secondary/20 to-secondary/5 text-secondary border border-secondary/20'}`}>
                      {(u.nombre || u.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <p className="font-bold text-text text-xl group-hover:text-primary transition-colors capitalize">{(u.nombre || u.name).toLowerCase()}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-sm font-medium text-muted">
                        <span className="bg-surface px-2.5 py-1 rounded-md border border-border/80 shadow-sm">DNI: {u.dni || u.Dni}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-4 py-1.5 rounded-xl font-bold text-sm shadow-sm border ${u.rol === 'emprendedor' || u.role === 'emprendedor' ? 'bg-primary text-white border-primary/20' : 'bg-white text-secondary border-secondary/20'}`}>
                      {u.rol === 'emprendedor' || u.role === 'emprendedor' ? 'Emprendedor' : 'Cliente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-muted mb-4 opacity-50" />
              <p className="text-lg text-muted">No hay usuarios registrados aún.</p>
            </div>
          )}
        </div>
      </div>

      <div className="w-full lg:max-w-md shrink-0">
        <div className="glass-panel p-8 sticky top-8 border border-border shadow-lg">
          <h3 className="text-2xl font-bold mb-6 border-b border-border pb-4">Registrar Nuevo</h3>
          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-text mb-2">Número de DNI</label>
              <input
                type="text"
                value={dni}
                onChange={handleDniChange}
                placeholder="Ej. 12345678"
                className="w-full p-4 border border-border rounded-xl focus:outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/10 transition-all text-lg font-medium tracking-widest bg-surface"
                required
              />
              {loading && <p className="text-sm text-muted mt-2 flex items-center gap-2">Consultando a RENIEC...</p>}
              {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
              {name && <p className="text-sm text-secondary font-bold mt-2">✔️ {name}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-text mb-2">Celular de Contacto</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                placeholder="Ej. 987654321"
                className="w-full p-4 border border-border rounded-xl focus:outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/10 transition-all text-lg bg-surface"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-text mb-2">Contraseña Temporal</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Asignar contraseña"
                className="w-full p-4 border border-border rounded-xl focus:outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/10 transition-all text-lg font-mono bg-surface"
                required
              />
            </div>

            {success && <p className="text-sm text-green-700 font-bold bg-green-50 p-4 rounded-xl border border-green-200 mt-4 text-center">{success}</p>}

            <button
              type="submit"
              disabled={dni.length !== 8 || !password || phone.length < 9 || !name}
              className="btn btn-secondary w-full font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none disabled:cursor-not-allowed mt-4 border-0"
            >
              Registrar Emprendedor
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const AdminInventory = () => {
  const { id } = useParams();
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Comida');
  
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/stores/${id}/products`)
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('emprendeHuaral_jwt')}`
        },
        body: JSON.stringify({
          tiendaId: id,
          nombre: name,
          precio: parseFloat(price).toFixed(2),
          categoria: category
        })
      });
      if (!res.ok) throw new Error("Error añadiendo producto");
      const newProduct = await res.json();
      setProducts([...products, newProduct]);
      setName('');
      setPrice('');
    } catch (e) {
      console.error(e);
      alert('Error añadiendo producto');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('emprendeHuaral_jwt')}`
        }
      });
      if (!res.ok) throw new Error("Error borrando producto");
      setProducts(products.filter((p: any) => p.Id !== productId));
    } catch (e) {
      console.error(e);
      alert('Error borrando producto');
    }
  };

  if (loading) return <div className="p-8">Cargando inventario...</div>;

  return (
    <div className="animate-fade-in p-8 text-left">
      <h1 className="text-3xl font-bold mb-8">Gestión de Inventario</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Form */}
        <div className="w-full lg:max-w-md shrink-0">
          <div className="glass-panel p-8 sticky top-8 border border-border shadow-sm">
            <h3 className="text-2xl font-bold mb-6 border-b border-border pb-4">Agregar Producto</h3>
            <form onSubmit={handleAddProduct} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-text mb-2">Nombre del Producto</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Hamburguesa Clásica"
                  className="w-full p-4 border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 bg-surface text-text"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-text mb-2">Precio (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ej. 12.50"
                  className="w-full p-4 border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 bg-surface text-text"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-text mb-2">Categoría</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-4 border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 bg-surface text-text"
                >
                  <option value="Comida">Comida</option>
                  <option value="Bebidas">Bebidas</option>
                  <option value="Acompañamientos">Acompañamientos</option>
                  <option value="Postres">Postres</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!name || !price || submitting}
                className="btn btn-primary w-full font-bold py-4 rounded-xl shadow-md disabled:opacity-50 mt-4 border-0"
              >
                {submitting ? 'Agregando...' : 'Agregar al Catálogo'}
              </button>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="flex-1">
          <div className="glass-panel p-8 border border-border shadow-sm min-h-[400px]">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Package size={24} className="text-primary" /> Mis Productos ({products.length})</h3>

            {products.length > 0 ? (
              <div className="space-y-4">
                {products.map((product: any) => (
                  <div key={product.Id} className="flex items-center justify-between p-4 bg-background border border-border rounded-xl group hover:border-primary transition-colors">
                    <div className="flex flex-col">
                      <span className="font-bold text-lg text-text">{product.Nombre}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm px-2 py-1 bg-surface border border-border rounded-md text-muted">{product.Categoria}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="text-xl font-black text-primary">S/ {product.Precio}</span>
                      <button
                        onClick={() => handleDeleteProduct(product.Id)}
                        className="text-muted hover:text-red-500 bg-surface p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Eliminar producto"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 flex flex-col items-center">
                <Package size={64} className="text-muted opacity-50 mb-4" />
                <p className="text-xl font-bold text-text mb-2">No tienes productos aún</p>
                <p className="text-muted">Empieza agregando tu primer producto en el formulario.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


const CurtainGridTransition = () => {
  const [show, setShow] = useState(true);
  const rows = 8;
  const cols = 12;
  
  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 2000); 
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex flex-col">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex-1 flex w-full">
          {Array.from({ length: cols }).map((_, c) => {
            const delay = (r + c) * 0.04;
            return (
              <div 
                key={c} 
                className="flex-1 bg-primary border border-primary/20 origin-top"
                style={{ 
                  animation: `curtainFade 0.6s cubic-bezier(0.77, 0, 0.175, 1) ${delay + 0.1}s forwards`
                }}
              ></div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

function App() {
  const [cart, setCart] = useState<any[]>([]);
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('emprendeHuaral_currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id && p.storeId === product.storeId);
      if (existing) {
        return prev.map(p => (p.id === product.id && p.storeId === product.storeId) ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  return (
    <GoogleOAuthProvider clientId="397515038296-f42ihcc9djveoburhjhjbiu0ac53122g.apps.googleusercontent.com">
      <CartContext.Provider value={{ cart, setCart, addToCart, user, setUser, isAuthModalOpen, setIsAuthModalOpen }}>
        <Router>
          <CurtainGridTransition />
        <Routes>
          {/* Client Routes */}
          <Route path="/" element={<ClientLayout />}>
            <Route index element={<ClientHome />} />
            <Route path="store/:id" element={<StoreCatalog />} />
            <Route path="cart" element={<CartView />} />
            <Route path="orders" element={<ClientOrders />} />
            <Route path="credits" element={<div className="container mx-auto p-8"><h1 className="text-3xl font-bold">Mis Fiados</h1></div>} />
            <Route path="settings" element={<div className="container mx-auto p-8"><h1 className="text-3xl font-bold">Configuración</h1></div>} />
          </Route>

          {/* Admin Routes */}
          <Route path="/store/:id/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="sales" element={<AdminSales />} />
            <Route path="inventory" element={<AdminInventory />} />
            <Route path="credits" element={<AdminCredits />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Development Routes */}
          <Route path="/development" element={<DevelopmentLayout />}>
            <Route index element={<DevDashboard />} />
            <Route path="ads" element={<div className="p-8"><h1 className="text-3xl font-bold">Publicidad</h1></div>} />
          </Route>
        </Routes>
      </Router>
      </CartContext.Provider>
    </GoogleOAuthProvider>
  );
}

export default App;
