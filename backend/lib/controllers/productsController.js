"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getProducts = void 0;
const db_1 = __importDefault(require("../config/db"));
const getProducts = async (req, res) => {
    try {
        const productsSnapshot = await db_1.default.collection('products').get();
        const products = productsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                features: data.features || [],
                specs: data.specs || [],
                published: !!data.published,
                in_stock: !!data.in_stock,
                gallery: data.gallery || (data.image ? [data.image] : [])
            };
        });
        res.json({ status: 'success', data: products });
    }
    catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.getProducts = getProducts;
const getProductById = async (req, res) => {
    const { id } = req.params;
    try {
        const productDoc = await db_1.default.collection('products').doc(id).get();
        if (!productDoc.exists) {
            return res.status(404).json({ status: 'error', message: 'Product not found' });
        }
        const data = productDoc.data();
        res.json({
            status: 'success',
            data: {
                id: productDoc.id,
                ...data,
                features: data.features || [],
                specs: data.specs || [],
                published: !!data.published,
                in_stock: !!data.in_stock,
                gallery: data.gallery && data.gallery.length > 0 ? data.gallery : (data.image ? [data.image] : [])
            }
        });
    }
    catch (error) {
        console.error('Error fetching product by ID:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.getProductById = getProductById;
const createProduct = async (req, res) => {
    const { name, slug, sku, brand, category, price, original_price, image, description, stock, published, features, specs, gallery } = req.body;
    const id = 'PRD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
        const parsedGallery = Array.isArray(gallery) ? gallery.filter((img) => img.trim() !== '') : [];
        const productData = {
            name: name || '',
            slug: slug || '',
            sku: sku || '',
            brand: brand || '',
            category: category || '',
            price: Number(price) || 0,
            original_price: Number(original_price) || 0,
            image: image || '',
            description: description || '',
            stock: Number(stock) || 0,
            in_stock: (Number(stock) || 0) > 0,
            published: !!published,
            features: features || [],
            specs: specs || [],
            gallery: parsedGallery,
            rating: 0,
            reviews: 0,
            sold: 0,
            revenue: 0.0,
            created_at: new Date().toISOString()
        };
        await db_1.default.collection('products').doc(id).set(productData);
        res.json({ status: 'success', message: 'Product created', data: { id } });
    }
    catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { name, price, original_price, stock, description, image, brand, category, published, features, specs, gallery } = req.body;
    try {
        const productRef = db_1.default.collection('products').doc(id);
        const productDoc = await productRef.get();
        if (!productDoc.exists) {
            return res.status(404).json({ status: 'error', message: 'Product not found' });
        }
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (price !== undefined)
            updateData.price = Number(price);
        if (original_price !== undefined)
            updateData.original_price = Number(original_price);
        if (stock !== undefined) {
            updateData.stock = Number(stock);
            updateData.in_stock = Number(stock) > 0;
        }
        if (description !== undefined)
            updateData.description = description;
        if (image !== undefined)
            updateData.image = image;
        if (brand !== undefined)
            updateData.brand = brand;
        if (category !== undefined)
            updateData.category = category;
        if (published !== undefined)
            updateData.published = !!published;
        if (features !== undefined)
            updateData.features = features;
        if (specs !== undefined)
            updateData.specs = specs;
        if (gallery !== undefined) {
            updateData.gallery = Array.isArray(gallery) ? gallery.filter((img) => img.trim() !== '') : [];
        }
        await productRef.update(updateData);
        res.json({ status: 'success', message: 'Product updated' });
    }
    catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        await db_1.default.collection('products').doc(id).delete();
        res.json({ status: 'success', message: 'Product deleted' });
    }
    catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Database error' });
    }
};
exports.deleteProduct = deleteProduct;
//# sourceMappingURL=productsController.js.map