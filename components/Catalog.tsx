import React, { useState, useEffect, useRef } from 'react';
import { Plus, Upload, Search, Edit2, Trash2, X, Save, FileSpreadsheet, Loader2, Package } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Product } from '../types';
import { useToast } from '../context/ToastContext';

export const Catalog: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    sku: '',
    price: 0,
    category: ''
  });

  useEffect(() => {
    fetchProducts();
  }, [user]);

  const fetchProducts = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setProducts(data);
    if (error) addToast("Failed to fetch products", "error");
    setLoading(false);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const productData = {
        user_id: user.id,
        name: formData.name!,
        description: formData.description || '',
        price: Number(formData.price) || 0,
        sku: formData.sku || '',
        category: formData.category || 'Uncategorized'
      };

      if (editingProduct?.id) {
        await supabase.from('products').update(productData).eq('id', editingProduct.id);
        addToast("Product updated successfully", "success");
      } else {
        await supabase.from('products').insert(productData);
        addToast("Product added successfully", "success");
      }
      
      setIsModalOpen(false);
      fetchProducts();
      resetForm();
    } catch (error) {
      console.error(error);
      addToast("Failed to save product", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if(error) {
          addToast("Delete failed", "error");
      } else {
          addToast("Product deleted", "success");
          fetchProducts();
      }
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({ name: '', description: '', sku: '', price: 0, category: '' });
  };

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData(product);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      // Simple CSV Parse (Assumes header: Name, Description, SKU, Price, Category)
      const lines = text.split('\n');
      const newProducts = [];
      
      // Skip header row 0, start at 1
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Basic comma splitting
        const cols = line.split(',');
        if (cols.length >= 2) {
            newProducts.push({
                user_id: user.id,
                name: cols[0]?.trim() || 'Imported Product',
                description: cols[1]?.trim() || '',
                sku: cols[2]?.trim() || '',
                price: parseFloat(cols[3]) || 0,
                category: cols[4]?.trim() || 'Imported'
            });
        }
      }

      if (newProducts.length > 0) {
          const { error } = await supabase.from('products').insert(newProducts);
          if (error) {
              addToast("Error importing CSV: " + error.message, "error");
          } else {
              addToast(`Successfully imported ${newProducts.length} products.`, "success");
              fetchProducts();
          }
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = ''; 
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Product Catalog</h2>
          <p className="text-slate-500 mt-1">Manage your inventory for vector search grounding.</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleCSVImport}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Upload size={18} />
            Import CSV
          </button>
          <button 
            onClick={() => openModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus size={18} />
            Add Product
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-3 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Search by name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
        />
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
           <div className="p-12 text-center text-slate-400">
               <Loader2 className="animate-spin mx-auto mb-2" size={24} />
               Loading Catalog...
           </div>
        ) : filteredProducts.length === 0 ? (
           <div className="p-12 text-center text-slate-500">
               <Package size={48} className="mx-auto mb-4 text-slate-300" />
               <p className="text-lg font-medium">No products found</p>
               <p className="text-sm">Add a product manually or import a CSV file.</p>
           </div>
        ) : (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{product.name}</div>
                        <div className="text-slate-500 text-xs truncate max-w-[200px]">{product.description}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">{product.sku}</td>
                    <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium">
                            {product.category}
                        </span>
                    </td>
                    <td className="px-6 py-4 font-medium">${product.price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => openModal(product)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button 
                                onClick={() => handleDelete(product.id!)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
                    <input 
                    type="text" 
                    value={formData.sku}
                    onChange={e => setFormData({...formData, sku: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Price</label>
                    <input 
                    type="number" 
                    step="0.01"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <input 
                  type="text" 
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                  placeholder="e.g. Electronics"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                ></textarea>
              </div>

              <div className="pt-4 flex gap-3">
                 <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                 >
                    Cancel
                 </button>
                 <button 
                    type="submit" 
                    className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                 >
                    <Save size={18} />
                    Save Product
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};