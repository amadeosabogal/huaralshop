-- Script de creación de base de datos para DevCenterSb

-- Tabla de Usuarios
CREATE TABLE Usuarios (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Dni VARCHAR(8) UNIQUE NULL,
    Nombre VARCHAR(255) NOT NULL,
    Telefono VARCHAR(20) NULL,
    PasswordHash VARCHAR(255) NULL,
    Rol VARCHAR(50) DEFAULT 'cliente', -- 'cliente', 'emprendedor', 'admin'
    GoogleId VARCHAR(255) UNIQUE NULL, -- Para el inicio de sesión con Google
    FechaRegistro DATETIME DEFAULT GETDATE()
);

-- Tabla de Tiendas (Para Emprendedores)
CREATE TABLE Tiendas (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UsuarioId INT UNIQUE FOREIGN KEY REFERENCES Usuarios(Id),
    Nombre VARCHAR(255) NOT NULL,
    Categoria VARCHAR(100) NULL,
    LogoUrl VARCHAR(500) NULL,
    FechaCreacion DATETIME DEFAULT GETDATE()
);

-- Tabla de Productos
CREATE TABLE Productos (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TiendaId INT FOREIGN KEY REFERENCES Tiendas(Id),
    Nombre VARCHAR(255) NOT NULL,
    Categoria VARCHAR(100) NULL,
    Precio DECIMAL(10,2) NOT NULL,
    Estado VARCHAR(50) DEFAULT 'activo' -- 'activo', 'inactivo'
);

-- Tabla de Pedidos
CREATE TABLE Pedidos (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TiendaId INT FOREIGN KEY REFERENCES Tiendas(Id),
    ClienteId INT FOREIGN KEY REFERENCES Usuarios(Id),
    Estado VARCHAR(50) DEFAULT 'Pendiente', -- 'Pendiente', 'Preparando', 'En camino', 'Entregado'
    Total DECIMAL(10,2) NOT NULL,
    FechaPedido DATETIME DEFAULT GETDATE()
);

-- Tabla de Detalles de Pedido
CREATE TABLE PedidoDetalles (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    PedidoId INT FOREIGN KEY REFERENCES Pedidos(Id),
    ProductoId INT FOREIGN KEY REFERENCES Productos(Id),
    Cantidad INT NOT NULL,
    PrecioUnitario DECIMAL(10,2) NOT NULL
);

-- Tabla de Sesiones (Vinculada al JWT)
CREATE TABLE Sesiones (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UsuarioId INT FOREIGN KEY REFERENCES Usuarios(Id),
    JwtKey VARCHAR(500) NOT NULL UNIQUE,
    FechaInicio DATETIME NOT NULL DEFAULT GETDATE(),
    FechaFin DATETIME NOT NULL,
    Estado VARCHAR(20) DEFAULT 'activo' -- 'activo' o 'inactivo'
);

-- Índice para mejorar el rendimiento al validar el token de sesión
CREATE NONCLUSTERED INDEX IX_Sesiones_JwtKey ON Sesiones(JwtKey);
