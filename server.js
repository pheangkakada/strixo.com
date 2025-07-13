const express = require('express');
const mysql = require('mysql2/promise'); // IMPORTANT: Use mysql2/promise for async/await
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt'); // For password hashing

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Assuming a 'public' directory for static files

// Database Connection Pool
const db = mysql.createPool({
    host: 'localhost',
    user: 'root', // Your MySQL username
    password: '', // Your MySQL password
    database: 'shopdb', // The database name you specified
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Test database connection when the server starts
db.getConnection()
    .then(connection => {
        console.log('✅ Connected to MySQL: shopdb');
        connection.release();
    })
    .catch(err => {
        console.error('❌ MySQL connection failed:', err);
        process.exit(1); // Exit the process if database connection fails
    });

// Helper function for safe JSON parsing (useful for sizes and colors columns)
function safeJsonParse(data) {
    try {
        if (!data) return [];
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        // Fallback for comma-separated strings if JSON parsing fails
        return typeof data === "string" && data.includes(",")
            ? data
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean) // Remove empty strings from array
            : [];
    }
}


// --- User Authentication Routes ---

// User registration endpoint
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        // Hash password for security
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Check if username or email already exists
        const [existingUsers] = await db.execute('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);

        if (existingUsers.length > 0) {
            return res.status(409).json({ error: 'Username or email already exists.' });
        }

        // Insert new user into the database
        const [result] = await db.execute('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);
        res.status(201).json({ message: 'User registered successfully!', userId: result.insertId });

    } catch (error) {
        console.error('❌ Error during user registration:', error);
        res.status(500).json({ error: 'Failed to register user.', details: error.message });
    }
});

// User login endpoint - MODIFIED TO LOGIN BY EMAIL
app.post('/login', async (req, res) => {
    // Expect 'username' from client, but treat it as 'email' for lookup
    const { username, password } = req.body; 

    if (!username || !password) {
        return res.status(400).json({ error: 'Email and password are required.' }); // Updated error message
    }

    try {
        // Fetch user by email (as 'username' from client is actually the email)
        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [username]); // Query by 'email' column

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' }); // Updated error message
        }

        const user = users[0];

        // Compare provided password with hashed password from database
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' }); // Updated error message
        }

        res.status(200).json({ message: 'Login successful!', user: { id: user.id, username: user.username, email: user.email } });

    } catch (error) {
        console.error('❌ Error during user login:', error);
        res.status(500).json({ error: 'Failed to log in.', details: error.message });
    }
});

// GET all users
app.get("/users/all", async (req, res) => {
    try {
        const [results] = await db.execute("SELECT id, username, email FROM users");
        res.json(results);
    } catch (error) {
        console.error("❌ Error fetching users:", error);
        res.status(500).json({ error: "Failed to fetch users.", details: error.message });
    }
});

// PUT (update) an existing user
app.put("/users/:id", async (req, res) => {
    const { id } = req.params;
    const { username, email, password } = req.body;
    let sql = "UPDATE users SET username = ?, email = ? WHERE id = ?";
    let values = [username, email, id];

    try {
        if (password) {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            sql = "UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?";
            values = [username, email, hashedPassword, id];
        }

        const [result] = await db.execute(sql, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "User not found." });
        }
        res.json({ message: "User updated successfully." + (password ? " (password changed)" : "") });
    } catch (error) {
        console.error("❌ Error updating user:", error);
        res.status(500).json({ error: "Failed to update user.", details: error.message });
    }
});

// DELETE a user
app.delete("/users/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute("DELETE FROM users WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "User not found." });
        }
        res.json({ message: "User deleted successfully." });
    } catch (error) {
        console.error("❌ Error deleting user:", error);
        res.status(500).json({ error: "Failed to delete user.", details: error.message });
    }
});


// --- Product Management Routes ---

// GET all products
app.get('/products', async (req, res) => {
    try {
        // Fetch products and order them by ID in descending order
        const [results] = await db.execute('SELECT * FROM products ORDER BY id DESC');
        // Parse JSON string fields (sizes, colors) into actual arrays
        const products = results.map((product) => ({
            ...product,
            sizes: safeJsonParse(product.sizes),
            colors: safeJsonParse(product.colors),
        }));
        res.json(products);
    } catch (error) {
        console.error('❌ Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products.', details: error.message });
    }
});

// GET product by ID
app.get('/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [results] = await db.execute('SELECT * FROM products WHERE id = ?', [id]);
        if (results.length === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        // Parse JSON string fields for the single product
        const product = {
            ...results[0],
            sizes: safeJsonParse(results[0].sizes),
            colors: safeJsonParse(results[0].colors),
        };
        res.json(product);
    } catch (error) {
        console.error('❌ Error fetching product by ID:', error);
        res.status(500).json({ error: 'Failed to fetch product.', details: error.message });
    }
});

// POST a new product
app.post('/products', async (req, res) => {
    const {
        name,
        category,
        image,
        description,
        priceSmall,
        priceLarge,
        sizes,
        colors,
        stock,
    } = req.body;

    // Convert arrays to JSON strings for database storage
    const sizesJson = JSON.stringify(sizes || []);
    const colorsJson = JSON.stringify(colors || []);

    try {
        const sql =
            "INSERT INTO products (name, category, image, description, priceSmall, priceLarge, sizes, colors, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const values = [
            name,
            category,
            image,
            description,
            priceSmall,
            priceLarge,
            sizesJson,
            colorsJson,
            stock,
        ];
        const [result] = await db.execute(sql, values);
        res
            .status(201)
            .json({ id: result.insertId, message: "Product added successfully!" });
    } catch (error) {
        console.error('❌ Error adding product:', error);
        res.status(500).json({ error: 'Failed to add product.', details: error.message });
    }
});

// PUT (update) an existing product
app.put('/products/:id', async (req, res) => {
    const { id } = req.params;
    const {
        name,
        category,
        image,
        description,
        priceSmall,
        priceLarge,
        sizes,
        colors,
        stock,
    } = req.body;

    // Convert arrays to JSON strings for database storage
    const sizesJson = JSON.stringify(sizes || []);
    const colorsJson = JSON.stringify(colors || []);

    try {
        const sql =
            "UPDATE products SET name = ?, category = ?, image = ?, description = ?, priceSmall = ?, priceLarge = ?, sizes = ?, colors = ?, stock = ? WHERE id = ?";
        const values = [
            name,
            category,
            image,
            description,
            priceSmall,
            priceLarge,
            sizesJson,
            colorsJson,
            stock,
            id,
        ];
        const [result] = await db.execute(sql, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Product not found." });
        }
        res.json({ message: "Product updated successfully!" });
    } catch (error) {
        console.error('❌ Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product.', details: error.message });
    }
});

// DELETE a product
app.delete('/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute("DELETE FROM products WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Product not found." });
        }
        res.json({ message: "Product deleted successfully!" });
    } catch (error) {
        console.error('❌ Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product.', details: error.message });
    }
});


// --- Category Management Routes ---

// GET all categories
app.get("/categories", async (req, res) => {
    try {
        const [results] = await db.execute("SELECT * FROM categories");
        res.json(results);
    } catch (error) {
        console.error("❌ Error fetching categories:", error);
        res.status(500).json({ error: "Failed to fetch categories.", details: error.message });
    }
});

// GET category by ID
app.get("/categories/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const [results] = await db.execute(
            "SELECT * FROM categories WHERE id = ?",
            [id]
        );
        if (results.length === 0) {
            return res.status(404).json({ error: "Category not found." });
        }
        res.json(results[0]);
    } catch (error) {
        console.error("❌ Error fetching category:", error);
        res.status(500).json({ error: "Failed to fetch category.", details: error.message });
    }
});

// POST a new category
app.post("/categories", async (req, res) => {
    const { name, image } = req.body;
    if (!name) {
        return res.status(400).json({ error: "Category name is required." });
    }
    try {
        const sql = "INSERT INTO categories (name, image) VALUES (?, ?)";
        const values = [name, image];
        const [result] = await db.execute(sql, values);
        res
            .status(201)
            .json({ id: result.insertId, message: "Category added successfully!" });
    } catch (error) {
        console.error("❌ Error adding category:", error);
        if (error.code === "ER_DUP_ENTRY") {
            return res
                .status(409)
                .json({ error: "Category with this name already exists." });
        }
        res.status(500).json({ error: "Failed to add category.", details: error.message });
    }
});

// PUT (update) an existing category
app.put("/categories/:id", async (req, res) => {
    const { id } = req.params;
    const { name, image } = req.body;
    if (!name) {
        return res.status(400).json({ error: "Category name is required." });
    }
    try {
        const sql = "UPDATE categories SET name = ?, image = ? WHERE id = ?";
        const values = [name, image, id];
        const [result] = await db.execute(sql, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Category not found." });
        }
        res.json({ message: "Category updated successfully!" });
    } catch (error) {
        console.error("❌ Error updating category:", error);
        if (error.code === "ER_DUP_ENTRY") {
            return res
                .status(409)
                .json({ error: "Category with this name already exists." });
        }
        res.status(500).json({ error: "Failed to update category.", details: error.message });
    }
});

// DELETE a category (and associated products)
app.delete("/categories/:id", async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Delete products associated with the category first
        const deleteProductsSql =
            "DELETE FROM products WHERE category = (SELECT name FROM categories WHERE id = ?)";
        await connection.execute(deleteProductsSql, [id]);

        // Then delete the category itself
        const deleteCategorySql = "DELETE FROM categories WHERE id = ?";
        const [result] = await connection.execute(deleteCategorySql, [id]);

        if (result.affectedRows === 0) {
            await connection.rollback(); // Rollback if category not found
            return res.status(404).json({ error: "Category not found." });
        }

        await connection.commit(); // Commit if all successful
        res.json({
            message: "Category and associated products deleted successfully!",
        });
    } catch (error) {
        if (connection) await connection.rollback(); // Rollback on error
        console.error("❌ Error deleting category or associated products:", error);
        res
            .status(500)
            .json({ error: "Failed to delete category.", details: error.message });
    } finally {
        if (connection) connection.release(); // Always release the connection
    }
});


// --- Order Management Routes ---

// GET all orders (with joined username)
app.get("/orders", async (req, res) => {
    try {
        const sql = `
            SELECT
                o.id,
                o.user_id,
                u.username, -- Fetch username from users table
                o.order_date,
                o.total_amount,
                o.status,
                o.payment_method,
                o.shipping_address,
                o.phone_number
            FROM
                orders o
            LEFT JOIN
                users u ON o.user_id = u.id
            ORDER BY
                o.order_date DESC;
        `;
        const [orders] = await db.execute(sql);
        res.json(orders);
    } catch (error) {
        console.error("❌ Error fetching orders:", error);
        res
            .status(500)
            .json({ error: "Failed to fetch orders.", details: error.message });
    }
});

// GET a single order by ID (with joined username)
app.get("/orders/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const sql = `
            SELECT
                o.id,
                o.user_id,
                u.username, -- Fetch username for single order details
                o.order_date,
                o.total_amount,
                o.status,
                o.payment_method,
                o.shipping_address,
                o.phone_number
            FROM
                orders o
            LEFT JOIN
                users u ON o.user_id = u.id
            WHERE
                o.id = ?;
        `;
        const [order] = await db.execute(sql, [id]);
        if (order.length === 0) {
            return res.status(404).json({ error: "Order not found." });
        }
        res.json(order[0]);
    } catch (error) {
        console.error("❌ Error fetching single order:", error);
        res.status(500).json({
            error: "Failed to fetch order details.",
            details: error.message,
        });
    }
});

// GET order items for a specific order ID
app.get("/orders/:id/items", async (req, res) => {
    const { id } = req.params;
    try {
        const sql = `
            SELECT
                oi.product_id,
                oi.quantity,
                oi.price_at_purchase AS price,
                oi.size,
                oi.color,
                oi.product_name, -- Include product_name from order_items
                oi.product_image -- Include product_image from order_items
            FROM
                order_items oi
            WHERE
                oi.order_id = ?
        `;
        const [items] = await db.execute(sql, [id]);
        res.json(items);
    } catch (error) {
        console.error("❌ Error fetching order items:", error);
        res
            .status(500)
            .json({ error: "Failed to fetch order items.", details: error.message });
    }
});

// POST a new order (with stock reduction and transaction management)
app.post('/orders', async (req, res) => {
    const { user_id, total_amount, status, payment_method, shipping_address, phone_number, items } = req.body;

    // Basic validation for required fields
    if (!total_amount || !payment_method || !shipping_address || !phone_number || !items || items.length === 0) {
        return res
            .status(400)
            .json({ error: "Missing required order details or empty cart." });
    }

    let connection; // Declare connection variable to be accessible in finally block
    try {
        connection = await db.getConnection(); // Get a connection from the pool
        await connection.beginTransaction(); // Start the transaction

        // Optional: Validate user_id if provided (ensure it exists)
        if (user_id) {
            const [userCheck] = await connection.execute(
                "SELECT id FROM users WHERE id = ?",
                [user_id]
            );
            if (userCheck.length === 0) {
                // If user_id is provided but doesn't exist, throw an error to rollback
                throw new Error("Invalid user ID provided.");
            }
        }

        // 1. Insert into orders table
        const orderSql = `INSERT INTO orders (user_id, order_date, total_amount, status, payment_method, shipping_address, phone_number)
                          VALUES (?, NOW(), ?, ?, ?, ?, ?)`;
        const [orderResult] = await connection.execute(orderSql, [
            user_id || null, // Allow null for guest orders if user_id is not provided
            total_amount,
            status || "pending", // Default status if not provided
            payment_method,
            shipping_address,
            phone_number,
        ]);
        const orderId = orderResult.insertId; // Get the ID of the newly created order

        // 2. Process each item: insert into order_items and update product stock
        const orderItemSql = `INSERT INTO order_items (order_id, product_id, product_name, product_image, quantity, price_at_purchase, size, color)
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        for (const item of items) {
            const productId = item.product.id;
            const qty = item.qty;
            // Determine the price to use (prefer priceSmall if available, else priceLarge)
            const priceAtPurchase = item.product.priceSmall || item.product.priceLarge || 0;

            // Basic validation for item details
            if (!productId || !qty || !priceAtPurchase) {
                throw new Error('Invalid item details for order_items insertion (missing product ID, quantity, or price).');
            }

            // Check current stock before deducting (using FOR UPDATE for pessimistic locking)
            const [stockRows] = await connection.execute(
                'SELECT stock FROM products WHERE id = ? FOR UPDATE', // Locks the row for this transaction
                [productId]
            );

            if (stockRows.length === 0) {
                throw new Error(`Product with ID ${productId} not found.`);
            }

            const currentStock = stockRows[0].stock;

            // Check for insufficient stock
            if (currentStock < qty) {
                throw new Error(`Insufficient stock for product: "${item.product.name}". Available: ${currentStock}, Ordered: ${qty}.`);
            }

            // Insert item into order_items table
            await connection.execute(orderItemSql, [
                orderId,
                productId,
                item.product.name,
                item.product.image || null, // Allow product image to be null
                qty,
                priceAtPurchase,
                item.size || null, // Allow size to be null
                item.color || null, // Allow color to be null
            ]);

            // Update product stock in the products table
            await connection.execute(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [qty, productId]
            );
        }

        await connection.commit(); // Commit the transaction if all operations succeed
        res.status(201).json({ message: 'Order placed successfully!', id: orderId });

    } catch (error) {
        if (connection) {
            await connection.rollback(); // Rollback the transaction on any error
        }
        console.error('❌ Error placing order (transaction rolled back):', error);
        res.status(500).json({ error: error.message || 'Failed to place order.' });
    } finally {
        if (connection) {
            connection.release(); // Always release the connection back to the pool
        }
    }
});

// DELETE an order by ID (and its associated items)
app.delete("/orders/:id", async (req, res) => {
    const { id } = req.params;
    let connection; // Declare connection variable
    try {
        connection = await db.getConnection();
        await connection.beginTransaction(); // Start transaction

        // Delete associated order items first to maintain referential integrity
        await connection.execute("DELETE FROM order_items WHERE order_id = ?", [
            id,
        ]);

        // Then delete the order itself
        const [result] = await connection.execute(
            "DELETE FROM orders WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            await connection.rollback(); // Rollback if order not found
            return res.status(404).json({ error: "Order not found." });
        }

        await connection.commit(); // Commit if successful
        res.json({ message: "Order and associated items deleted successfully!" });
    } catch (error) {
        if (connection) await connection.rollback(); // Rollback on error
        console.error("❌ Error deleting order:", error);
        res
            .status(500)
            .json({ error: "Failed to delete order.", details: error.message });
    } finally {
        if (connection) connection.release(); // Always release the connection
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
