const mysql = require('mysql2/promise');
require('dotenv').config();

async function init() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });

  console.log('Connected to MySQL server.');

  await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'webion_db'}`);
  console.log(`Database ${process.env.DB_NAME || 'webion_db'} ensured.`);

  await connection.query(`USE ${process.env.DB_NAME || 'webion_db'}`);

  const schema = `
    CREATE TABLE IF NOT EXISTS products (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10,2),
      image_url TEXT,
      category VARCHAR(100),
      seller_name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS garment_dimensions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      product_id INT,
      shoulder_width DECIMAL(6,2),
      chest_width DECIMAL(6,2),
      garment_length DECIMAL(6,2),
      sleeve_length DECIMAL(6,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS buyer_dimensions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      session_id VARCHAR(100),
      shoulder_width DECIMAL(6,2),
      chest_width DECIMAL(6,2),
      torso_length DECIMAL(6,2),
      hip_width DECIMAL(6,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ar_sessions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      buyer_session VARCHAR(100),
      product_id INT,
      fit_score INT,
      recommendation VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Basic split and execute (ignoring empty lines)
  const statements = schema.split(';').filter(s => s.trim().length > 0);
  for (let statement of statements) {
    await connection.query(statement);
  }
  console.log('Tables created.');

  // Seed sample data
  const seed = [
    [1, 'Silk Mesh Blazer', 'Premium silk mesh blazer with modern cut', 1850.00, 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400', 'Blazer', 'Alex Volkov'],
    [2, 'Cotton Formal Shirt', 'Pure cotton formal shirt, slim fit', 950.00, 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400', 'Shirt', 'Alex Volkov'],
    [3, 'Linen Summer Dress', 'Lightweight linen dress for summer', 1200.00, 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400', 'Dress', 'Alex Volkov'],
    [4, 'Wool Overcoat', 'Classic wool overcoat, winter collection', 2500.00, 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=400', 'Coat', 'Alex Volkov']
  ];

  for (let row of seed) {
    await connection.query(
      'INSERT IGNORE INTO products (id, name, description, price, image_url, category, seller_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
      row
    );
  }
  console.log('Sample data seeded.');

  await connection.end();
  console.log('Initialization complete.');
}

init().catch(err => {
  console.error('Initialization failed:', err);
  process.exit(1);
});
