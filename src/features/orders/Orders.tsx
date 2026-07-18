import { useState, useMemo, useEffect } from 'react';
import { ShoppingCart, Search, Plus, Download, Eye, RotateCcw, Truck, Clock, CheckCircle, XCircle, RefreshCw, FileText, Users, History } from 'lucide-react';
import { generateOrders, updateOrderStatus, addOrder, formatCurrency, formatDate, formatTime, timeAgo } from '../../mock/data';
import { fetchOrdersFromBackend, updateOrderStatusInBackend, createOrderFromAdminInBackend, updateOrderInBackend, validateCouponCode, fetchProductsFromBackend, syncOrdersInBackend, assignOrderInBackend, fetchActiveEmployees, fetchOrderHistory } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const DEMO_PRODUCTS: any[] = [];

const statusConfig: Record<string, { class: string; icon: any }> = {
  pending: { class: 'badge-warning', icon: Clock },
  processing: { class: 'badge-info', icon: RefreshCw },
  shipped: { class: 'badge-primary', icon: Truck },
  delivered: { class: 'badge-success', icon: CheckCircle },
  cancelled: { class: 'badge-danger', icon: XCircle },
  returned: { class: 'badge-purple', icon: RotateCcw },
};

const BD_DISTRICTS: Record<string, string[]> = {
  "Dhaka": ["Dhamrai", "Dohar", "Keraniganj", "Nawabganj", "Savar"],
  "Faridpur": ["Alfadanga", "Bhanga", "Boalmari", "Charbhadrasan", "Faridpur Sadar", "Madhukhali", "Nagarkanda", "Sadorpur", "Saltha"],
  "Gazipur": ["Gazipur Sadar", "Kaliakair", "Kaliganj", "Kapasia", "Sreepur"],
  "Gopalganj": ["Gopalganj Sadar", "Kashiani", "Kotalipara", "Muksudpur", "Tungipara"],
  "Kishoreganj": ["Austagram", "Bajitpur", "Bhairab", "Hossainpur", "Itna", "Karimganj", "Katiadi", "Kishoreganj Sadar", "Kuliarchar", "Mithamain", "Nikli", "Pakundia", "Tarail"],
  "Madaripur": ["Kalkini", "Madaripur Sadar", "Rajoir", "Shibchar", "Dasar"],
  "Manikganj": ["Daulatpur", "Ghior", "Harirampur", "Manikganj Sadar", "Saturia", "Shibalaya", "Singair"],
  "Munshiganj": ["Gazaria", "Lohajang", "Munshiganj Sadar", "Sirajdikhan", "Sreenagar", "Tongibari"],
  "Narayanganj": ["Araihazar", "Sonargaon", "Narayanganj Sadar", "Rupganj", "Bandar"],
  "Narsingdi": ["Belabo", "Monohardi", "Narsingdi Sadar", "Palash", "Raipura", "Shibpur"],
  "Rajbari": ["Baliakandi", "Goalanda", "Kalukhali", "Pangsha", "Rajbari Sadar"],
  "Shariatpur": ["Bhederganj", "Damudya", "Gosairhat", "Naria", "Shariatpur Sadar", "Zajira"],
  "Tangail": ["Basail", "Bhuapur", "Delduar", "Dhanbari", "Ghatail", "Gopalpur", "Kalihati", "Madhupur", "Mirzapur", "Nagarpur", "Sakhipur", "Tangail Sadar"],
  "Bagerhat": ["Chitalmari", "Fakirhat", "Kachua", "Mollahat", "Mongla", "Morelganj", "Rampal", "Sarankhola", "Bagerhat Sadar"],
  "Chuadanga": ["Alamdanga", "Chuadanga Sadar", "Damurhuda", "Jibannagar"],
  "Jashore": ["Abhaynagar", "Bagherpara", "Chougachha", "Jhikargachha", "Keshabpur", "Jashore Sadar", "Manirampur", "Sharsha"],
  "Jhenaidah": ["Harinakunda", "Jhenaidah Sadar", "Kaliganj", "Kotchandpur", "Moheshpur", "Shailkupa"],
  "Khulna": ["Batiaghata", "Dacope", "Dumuria", "Koyra", "Paikgachha", "Phultala", "Rupsha", "Terokhada", "Dighalia"],
  "Kushtia": ["Bheramara", "Daulatpur", "Khoksa", "Kumarkhali", "Kushtia Sadar", "Mirpur"],
  "Magura": ["Magura Sadar", "Mohammadpur", "Shalikha", "Sreepur"],
  "Meherpur": ["Gangni", "Mujibnagar", "Meherpur Sadar"],
  "Narail": ["Kalia", "Lohagara", "Narail Sadar"],
  "Satkhira": ["Assasuni", "Debhata", "Kalaroa", "Kaliganj", "Satkhira Sadar", "Shyamnagar", "Tala"],
  "Bandarban": ["Alikadam", "Bandarban Sadar", "Lama", "Naikhongchhari", "Rowangchhari", "Ruma", "Thanchi"],
  "Brahmanbaria": ["Akhaura", "Bancharampur", "Bijoynagar", "Brahmanbaria Sadar", "Ashuganj", "Kasba", "Nabinagar", "Nasirnagar", "Sarail"],
  "Chandpur": ["Chandpur Sadar", "Faridganj", "Haimchar", "Haziganj", "Kachua", "Matlab Dakshin", "Matlab Uttar", "Shahrasti"],
  "Chattogram": ["Anwara", "Banshkhali", "Boalkhali", "Chandanaish", "Fatikchhari", "Hathazari", "Lohagara", "Mirsharai", "Patiya", "Rangunia", "Raozan", "Sandwip", "Satkania", "Sitakunda", "Karnafuli"],
  "Cumilla": ["Barura", "Brahmanpara", "Burichang", "Chandina", "Chauddagram", "Adarsha Sadar", "Sadar Dakshin", "Daudkandi", "Debidwar", "Homna", "Laksam", "Monohorganj", "Meghna", "Muradnagar", "Nangalkot", "Titas", "Lalmai"],
  "Cox's Bazar": ["Chakaria", "Coxs Bazar Sadar", "Kutubdia", "Moheshkhali", "Pekua", "Ramu", "Teknaf", "Ukhia", "Eidgaon"],
  "Feni": ["Chhagalnaiya", "Daganbhuiyan", "Feni Sadar", "Fulgazi", "Parshuram", "Sonagazi"],
  "Khagrachhari": ["Dighinala", "Manikchhari", "Khagrachhari Sadar", "Lakshmichhari", "Mahalchhari", "Matiranga", "Panchhari", "Ramgarh", "Guimara"],
  "Lakshmipur": ["Kamalnagar", "Lakshmipur Sadar", "Raipur", "Ramganj", "Ramgoti"],
  "Noakhali": ["Begumganj", "Chatkhil", "Companiganj", "Hatiya", "Senbagh", "Sonaimuri", "Subarnachar", "Noakhali Sadar", "Kabirhat"],
  "Rangamati": ["Baghaichhari", "Barkal", "Kawkhali", "Kaptai", "Juraichhari", "Langadu", "Naniarchar", "Rangamati Sadar", "Rajasthali", "Bilaichhari"],
  "Bogura": ["Adamdighi", "Bogura Sadar", "Dhunot", "Dupchanchia", "Gabtali", "Kahaloo", "Nandigram", "Sariakandi", "Shajahanpur", "Sherpur", "Shibganj", "Sonatala"],
  "Joypurhat": ["Akkelpur", "Joypurhat Sadar", "Kalai", "Panchbibi", "Khetlal"],
  "Naogaon": ["Atrai", "Dhamoirhat", "Manda", "Mohadevpur", "Naogaon Sadar", "Niamutpur", "Patnitala", "Raninagar", "Sapahar", "Badalgachhi", "Porsha"],
  "Natore": ["Bagatipara", "Baraigram", "Gurudaspur", "Lalpur", "Natore Sadar", "Singra", "Naldanga"],
  "Chapainawabganj": ["Shibganj", "Bholahat", "Gomastapur", "Nachole", "Chapainawabganj Sadar"],
  "Pabna": ["Atgharia", "Bera", "Bhangura", "Chatmohar", "Faridpur", "Ishwardi", "Pabna Sadar", "Santhia", "Sujanagar"],
  "Rajshahi": ["Bagha", "Bagmara", "Charghat", "Durgapur", "Godagari", "Mohanpur", "Paba", "Puthia", "Tanor"],
  "Sirajganj": ["Belkuchi", "Chauhali", "Kamarkhanda", "Kazipur", "Raiganj", "Shahjadpur", "Sirajganj Sadar", "Tarash", "Ullapara"],
  "Habiganj": ["Ajmiriganj", "Bahubal", "Baniyachong", "Chunarughat", "Habiganj Sadar", "Lakhai", "Madhabpur", "Nabiganj", "Sayestaganj"],
  "Moulvibazar": ["Barlekha", "Juri", "Kamalganj", "Kulaura", "Moulvibazar Sadar", "Rajnagar", "Sreemangal"],
  "Sunamganj": ["Bishwambharpur", "Chhatak", "Derai", "Dharampasha", "Dowarabazar", "Jagannathpur", "Jamalganj", "Sallah", "Sunamganj Sadar", "Tahirpur", "Shantiganj", "Madhyanagar"],
  "Sylhet": ["Balaganj", "Beanibazar", "Bishwanath", "Companiganj", "Fenchuganj", "Golapganj", "Gowainghat", "Jaintiapur", "Kanaighat", "Sylhet Sadar", "Zakiganj", "Osmaninagar", "Dakshin Surma"],
  "Dinajpur": ["Birampur", "Birganj", "Biral", "Bochaganj", "Chirirbandar", "Phulbari", "Ghoraghat", "Hakimpur", "Kaharole", "Khansama", "Nawabganj", "Parbatipur", "Dinajpur Sadar"],
  "Gaibandha": ["Phulchhari", "Gaibandha Sadar", "Gobindaganj", "Palashbari", "Sadullapur", "Saghata", "Sundarganj"],
  "Kurigram": ["Phulbari", "Bhurungamari", "Char Rajibpur", "Chilmari", "Kurigram Sadar", "Nageshwari", "Rajarhat", "Rowmari", "Ulipur"],
  "Lalmonirhat": ["Aditmari", "Hatibandha", "Kaliganj", "Lalmonirhat Sadar", "Patgram"],
  "Nilphamari": ["Domar", "Jaldhaka", "Kishoreganj", "Nilphamari Sadar", "Sayedpur", "Dimla"],
  "Panchagarh": ["Atwari", "Boda", "Debiganj", "Panchagarh Sadar", "Tetulia"],
  "Rangpur": ["Badarganj", "Kaunia", "Rangpur Sadar", "Mithapukur", "Pirgachha", "Pirganj", "Taraganj", "Gangachhara"],
  "Thakurgaon": ["Pirganj", "Baliadangi", "Haripur", "Ranisankail", "Thakurgaon Sadar"],
  "Jamalpur": ["Bakshiganj", "Dewanganj", "Islampur", "Jamalpur Sadar", "Madarganj", "Melandaha", "Sarishabari"],
  "Mymensingh": ["Valuka", "Dhobaura", "Fulbaria", "Gafargaon", "Gouripur", "Haluaghat", "Ishwarganj", "Mymensingh Sadar", "Muktagachha", "Nandail", "Phulpur", "Tarakanda", "Trishal"],
  "Netrokona": ["Atpara", "Barhatta", "Durgapur", "Khaliajuri", "Kalmakanda", "Kendua", "Madan", "Mohanganj", "Netrokona Sadar", "Purbadhala"],
  "Sherpur": ["Jhenaigati", "Nakla", "Nalitabari", "Sherpur Sadar", "Sreebardi"],
  "Jhalokati": ["Jhalokati Sadar", "Nalchity", "Kathalia", "Rajapur"],
  "Barguna": ["Amtali", "Bamna", "Barguna Sadar", "Betagi", "Patharghata", "Taltali"],
  "Barishal": ["Agailjhara", "Babuganj", "Bakerganj", "Banaripara", "Wazirpur", "Muladi", "Mehendiganj", "Barishal Sadar", "Hizla", "Gournadi"],
  "Bhola": ["Bhola Sadar", "Burhanuddin", "Daulatkhan", "Lalmohan", "Manpura", "Tazumuddin", "Char Fasson"],
  "Patuakhali": ["Bauphal", "Dashmina", "Dumki", "Kalapara", "Mirzaganj", "Patuakhali Sadar", "Rangabali", "Galachipa"],
  "Pirojpur": ["Bhandaria", "Kawkhali", "Mathbaria", "Nazirpur", "Pirojpur Sadar", "Nesarabad", "Zianagar"]
};

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      const dbOrders = await fetchOrdersFromBackend();
      if (dbOrders !== null) {
        setOrders(dbOrders);
      } else {
        // Fallback to localStorage orders (which generateOrders returns)
        setOrders(generateOrders(60));
      }
      setIsLoading(false);
    };

    const loadProducts = async () => {
      const dbProducts = await fetchProductsFromBackend();
      if (dbProducts && dbProducts.length > 0) {
        setProducts(dbProducts);
      }
    };

    loadOrders();
    loadProducts();
  }, []);

  // Order Sync state
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [activeEmployees, setActiveEmployees] = useState<any[]>([]);
  const [reassigningOrderId, setReassigningOrderId] = useState<string | null>(null);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Admin';

  useEffect(() => {
    if (isAdmin) {
      fetchActiveEmployees().then(setActiveEmployees);
    }
  }, [isAdmin]);

  const handleSyncOrders = async () => {
    setIsSyncing(true);
    setSyncMessage('');
    const result = await syncOrdersInBackend();
    if (result.status === 'success') {
      setSyncMessage(result.message || 'Orders synced!');
      // Reload orders to show assignments
      const dbOrders = await fetchOrdersFromBackend();
      if (dbOrders !== null) {
        setOrders(dbOrders);
      }
      // Also refresh active employees list
      fetchActiveEmployees().then(setActiveEmployees);
    } else {
      setSyncMessage(result.message || 'Sync failed');
    }
    setIsSyncing(false);
    setTimeout(() => setSyncMessage(''), 4000);
  };

  const handleReassignOrder = async (orderId: string, employeeId: string | null) => {
    const result = await assignOrderInBackend(orderId, employeeId);
    if (result.status === 'success') {
      setOrders(prev => prev.map(o =>
        o.id === orderId
          ? { ...o, assigned_to: result.data.assigned_to, assigned_name: result.data.assigned_name }
          : o
      ));
      if (modalOpen && formInvoice === orderId) {
        try {
          const logs = await fetchOrderHistory(orderId);
          setOrderHistory(logs);
        } catch (e) {
          console.error(e);
        }
      }
    }
    setReassigningOrderId(null);
  };

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [page, setPage] = useState(1);
  const perPage = 12;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds([]);
  }, [filterType]);

  // New Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingOrder, setEditingOrder] = useState<typeof orders[0] | null>(null);

  const [formStoreName, setFormStoreName] = useState('GAZI SPORTS 24');
  const [formInvoice, setFormInvoice] = useState('');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formCustomerPhone, setFormCustomerPhone] = useState('');
  const [formCustomerAddress, setFormCustomerAddress] = useState('');
  const [formCourier, setFormCourier] = useState('Pathao');
  const [formStatus, setFormStatus] = useState<typeof orders[0]['status']>('processing');
  const [formDate, setFormDate] = useState('');
  const [formCity, setFormCity] = useState('Dhaka');
  const [formThana, setFormThana] = useState('');
  const [formArea, setFormArea] = useState('');
  const [formCustomerNote, setFormCustomerNote] = useState('');
  const [formShopNote, setFormShopNote] = useState('');
  const [formPaymentType, setFormPaymentType] = useState('cod');
  const [formMemoNumber, setFormMemoNumber] = useState('');
  const [formDeliveryCharge, setFormDeliveryCharge] = useState(60);
  const [formDiscount, setFormDiscount] = useState(0);
  const [formPaidAmount, setFormPaidAmount] = useState(0);
  const [formProducts, setFormProducts] = useState<any[]>([]);

  // Coupon states
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponMsg, setCouponMsg] = useState('');

  const handleApplyAdminCoupon = async () => {
    if (!couponCodeInput.trim()) return;
    setCouponMsg('Validating...');
    const res = await validateCouponCode(couponCodeInput.trim());
    if (res.status === 'success' && res.data) {
      const coupon = res.data;
      const subtotal = formProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
      let disc = 0;
      if (coupon.type === 'percentage') {
        disc = parseFloat(((subtotal * coupon.value) / 100).toFixed(2));
      } else {
        disc = coupon.value;
      }
      setFormDiscount(disc);
      setCouponMsg(`Applied! ৳${disc} discount.`);
    } else {
      setCouponMsg(res.message || 'Invalid coupon code');
    }
  };

  const [productSearch, setProductSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const openCreateModal = () => {
    setModalMode('create');
    setFormStoreName('GAZI SPORTS 24');
    setFormInvoice(`TR${Math.floor(1000000 + Math.random() * 9000000)}`);
    setFormCustomerName('');
    setFormCustomerPhone('');
    setFormCustomerAddress('');
    setFormCourier('Pathao');
    setFormStatus('processing');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormCity('Dhaka');
    setFormThana('');
    setFormArea('');
    setFormCustomerNote('');
    setFormShopNote('');
    setFormPaymentType('cod');
    setFormMemoNumber('');
    setFormDeliveryCharge(60);
    setFormDiscount(0);
    setFormPaidAmount(0);
    setFormProducts([]);
    setCouponCodeInput('');
    setCouponMsg('');
    setModalOpen(true);
  };

  const openEditModal = async (order: typeof orders[0]) => {
    setModalMode('edit');
    setEditingOrder(order);
    setFormStoreName(order.storeName || 'GAZI SPORTS 24');
    setFormInvoice(order.id);
    setFormCustomerName(order.customer);
    setFormCustomerPhone(order.email || order.phone || '');
    setFormCustomerAddress(order.address || '');
    setFormCourier(order.courier || 'Pathao');
    setFormStatus(order.status);
    setFormDate(order.date ? order.date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setFormCity(order.city || 'Dhaka');
    setFormThana(order.thana || '');
    setFormArea(order.area || '');
    setFormCustomerNote(order.customerNote || '');
    setFormShopNote(order.shopNote || '');
    setFormPaymentType(order.paymentType || 'cod');
    setFormMemoNumber(order.memoNumber || '');
    setFormDeliveryCharge(order.deliveryCharge || 60);
    setFormDiscount(order.discount || 0);
    setFormPaidAmount(order.paidAmount || 0);
    setFormProducts(order.productsList || []);
    setCouponCodeInput('');
    setCouponMsg('');
    setOrderHistory([]);
    setModalOpen(true);

    try {
      const logs = await fetchOrderHistory(order.id);
      setOrderHistory(logs);
    } catch (e) {
      console.error('Failed to load order history:', e);
    }
  };

  const handlePrintInvoice = () => {
    const subtotal = formProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const total = subtotal + formDeliveryCharge - formDiscount;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${formInvoice}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 40px; font-size: 14px; }
            .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.05); border-radius: 8px; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            .header-table td { vertical-align: top; }
            .store-name { font-size: 28px; font-weight: bold; color: #6366f1; text-transform: uppercase; margin: 0; }
            .invoice-title { font-size: 24px; font-weight: bold; text-align: right; color: #475569; margin: 0; }
            .invoice-details { text-align: right; font-size: 13px; color: #64748b; margin-top: 10px; }
            .billing-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            .billing-table td { width: 50%; vertical-align: top; }
            .billing-title { font-size: 12px; text-transform: uppercase; font-weight: bold; color: #94a3b8; margin-bottom: 8px; letter-spacing: 1px; }
            .billing-info { line-height: 1.5; color: #1e293b; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; text-align: left; }
            .items-table th { padding: 12px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; font-weight: bold; color: #64748b; }
            .items-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
            .totals-table { width: 300px; margin-left: auto; border-collapse: collapse; font-size: 13px; }
            .totals-table td { padding: 8px 12px; text-align: right; }
            .totals-table tr.total-row { font-size: 16px; font-weight: bold; color: #6366f1; border-top: 2px solid #e2e8f0; }
            .notes-section { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #64748b; line-height: 1.5; }
            .footer { text-align: center; margin-top: 60px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
            @media print {
              body { padding: 0; }
              .invoice-box { border: none; box-shadow: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <table class="header-table">
              <tr>
                <td>
                  <h1 class="store-name">${formStoreName}</h1>
                  <div style="font-size: 13px; color: #64748b; margin-top: 5px;">Reliable & Premium Shopping</div>
                </td>
                <td>
                  <h2 class="invoice-title">INVOICE</h2>
                  <div class="invoice-details">
                    <strong>Invoice #:</strong> ${formInvoice}<br>
                    <strong>Date:</strong> ${formDate}<br>
                    <strong>Courier:</strong> ${formCourier}
                  </div>
                </td>
              </tr>
            </table>

            <table class="billing-table">
              <tr>
                <td>
                  <div class="billing-title">Billing To</div>
                  <div class="billing-info">
                    <strong>${formCustomerName}</strong><br>
                    Phone: ${formCustomerPhone}<br>
                    Address: ${formCustomerAddress}<br>
                    District: ${formCity}
                  </div>
                </td>
                <td>
                  <div class="billing-title">Order Info</div>
                  <div class="billing-info">
                    <strong>Payment Method:</strong> ${formPaymentType === 'cod' ? 'Cash on Delivery' : formPaymentType.toUpperCase()}<br>
                    <strong>Memo Number:</strong> ${formMemoNumber || 'N/A'}<br>
                    <strong>Status:</strong> ${formStatus.toUpperCase()}
                  </div>
                </td>
              </tr>
            </table>

            <table class="items-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Details</th>
                  <th>Variant</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Unit Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${formProducts.map((p: any) => `
                  <tr>
                    <td style="font-family: monospace; font-size: 12px; color: #475569;">${p.code || 'N/A'}</td>
                    <td><strong>${p.name}</strong></td>
                    <td style="font-size: 12px; color: #64748b;">Color: ${p.color || 'Default'}, Size: ${p.size || 'Free Size'}</td>
                    <td style="text-align: center;">${p.quantity}</td>
                    <td style="text-align: right;">৳${p.price.toFixed(2)}</td>
                    <td style="text-align: right; font-weight: bold;">৳${(p.price * p.quantity).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <table class="totals-table">
              <tr>
                <td style="color: #64748b;">Subtotal:</td>
                <td>৳${subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="color: #64748b;">Delivery Charge:</td>
                <td>৳${formDeliveryCharge.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="color: #64748b;">Discount:</td>
                <td style="color: #10b981;">-৳${formDiscount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="color: #64748b;">Paid Amount:</td>
                <td>৳${formPaidAmount.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td>Net Payable:</td>
                <td>৳${(total - formPaidAmount).toFixed(2)}</td>
              </tr>
            </table>

            ${(formCustomerNote || formShopNote) ? `
              <div class="notes-section">
                ${formCustomerNote ? `<strong>Customer Note:</strong> ${formCustomerNote}<br>` : ''}
                ${formShopNote ? `<strong>Shop Note:</strong> ${formShopNote}<br>` : ''}
              </div>
            ` : ''}

            <div class="footer">
              Thank you for your business!<br>
              <span style="font-size: 10px; color: #cbd5e1; margin-top: 5px; display: block;">Generated by Gazi Sports</span>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportOrders = () => {
    const ordersToExport = selectedIds.length > 0 
      ? filtered.filter(o => selectedIds.includes(o.id))
      : filtered;

    if (ordersToExport.length === 0) {
      alert('No orders available to export.');
      return;
    }

    const headers = [
      'Order ID',
      'Customer Name',
      'Phone/Email',
      'Store Name',
      'Date',
      'Amount (৳)',
      'Status',
      'Courier',
      'City/District',
      'Thana',
      'Area',
      'Address',
      'Payment Type',
      'Memo Number',
      'Customer Note',
      'Shop Note'
    ];

    const rows = ordersToExport.map(o => [
      o.id,
      `"${o.customer.replace(/"/g, '""')}"`,
      `"${(o.email || o.phone || '').replace(/"/g, '""')}"`,
      `"${(o.storeName || '').replace(/"/g, '""')}"`,
      o.date,
      o.amount,
      o.status.toUpperCase(),
      `"${(o.courier || '').replace(/"/g, '""')}"`,
      `"${(o.city || '').replace(/"/g, '""')}"`,
      `"${(o.thana || '').replace(/"/g, '""')}"`,
      `"${(o.area || '').replace(/"/g, '""')}"`,
      `"${(o.address || '').replace(/"/g, '""')}"`,
      `"${(o.paymentType || o.paymentMethod || '').replace(/"/g, '""')}"`,
      `"${(o.memoNumber || '').replace(/"/g, '""')}"`,
      `"${(o.customerNote || '').replace(/"/g, '""')}"`,
      `"${(o.shopNote || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintAllShippedOrders = () => {
    const shippedOrders = filtered.filter(o => o.status === 'shipped' && selectedIds.includes(o.id));
    if (shippedOrders.length === 0) {
      alert('Please select shipped orders to print.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const invoicesHTML = shippedOrders.map((order) => {
      const subtotal = (order.productsList || []).reduce((sum: number, p: any) => sum + (p.price * p.quantity), 0);
      const total = subtotal + (order.deliveryCharge || 60) - (order.discount || 0);
      const paidAmount = order.paidAmount || 0;
      const netPayable = total - paidAmount;

      return `
        <div class="invoice-page">
          <div class="invoice-box">
            <table class="header-table">
              <tr>
                <td>
                  <h1 class="store-name">${order.storeName || 'GAZI SPORTS 24'}</h1>
                  <div style="font-size: 13px; color: #64748b; margin-top: 5px;">Reliable & Premium Shopping</div>
                </td>
                <td>
                  <h2 class="invoice-title">INVOICE</h2>
                  <div class="invoice-details">
                    <strong>Invoice #:</strong> ${order.id}<br>
                    <strong>Date:</strong> ${formatDate(order.date)}<br>
                    <strong>Courier:</strong> ${order.courier || 'Pathao'}
                  </div>
                </td>
              </tr>
            </table>

            <table class="billing-table">
              <tr>
                <td>
                  <div class="billing-title">Billing To</div>
                  <div class="billing-info">
                    <strong>${order.customer}</strong><br>
                    Phone: ${order.email || order.phone || 'N/A'}<br>
                    Address: ${order.address || 'N/A'}<br>
                    District: ${order.city || 'N/A'}
                  </div>
                </td>
                <td>
                  <div class="billing-title">Order Info</div>
                  <div class="billing-info">
                    <strong>Payment Method:</strong> ${(order.paymentMethod || order.paymentType || 'cod') === 'cod' ? 'Cash on Delivery' : (order.paymentMethod || order.paymentType || '').toUpperCase()}<br>
                    <strong>Memo Number:</strong> ${order.memoNumber || 'N/A'}<br>
                    <strong>Status:</strong> ${order.status.toUpperCase()}
                  </div>
                </td>
              </tr>
            </table>

            <table class="items-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Details</th>
                  <th>Variant</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Unit Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${(order.productsList || []).map((p: any) => `
                  <tr>
                    <td style="font-family: monospace; font-size: 12px; color: #475569;">${p.code || 'N/A'}</td>
                    <td><strong>${p.name}</strong></td>
                    <td style="font-size: 12px; color: #64748b;">Color: ${p.color || 'Default'}, Size: ${p.size || 'Free Size'}</td>
                    <td style="text-align: center;">${p.quantity}</td>
                    <td style="text-align: right;">৳${p.price.toFixed(2)}</td>
                    <td style="text-align: right; font-weight: bold;">৳${(p.price * p.quantity).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <table class="totals-table">
              <tr>
                <td style="color: #64748b;">Subtotal:</td>
                <td>৳${subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="color: #64748b;">Delivery Charge:</td>
                <td>৳${(order.deliveryCharge || 60).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="color: #64748b;">Discount:</td>
                <td style="color: #10b981;">-৳${(order.discount || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="color: #64748b;">Paid Amount:</td>
                <td>৳${paidAmount.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td>Net Payable:</td>
                <td>৳${netPayable.toFixed(2)}</td>
              </tr>
            </table>

            ${(order.customerNote || order.shopNote) ? `
              <div class="notes-section">
                ${order.customerNote ? `<strong>Customer Note:</strong> ${order.customerNote}<br>` : ''}
                ${order.shopNote ? `<strong>Shop Note:</strong> ${order.shopNote}<br>` : ''}
              </div>
            ` : ''}

            <div class="footer">
              Thank you for your business!<br>
              <span style="font-size: 10px; color: #cbd5e1; margin-top: 5px; display: block;">Generated by Gazi Sports</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Shipped Orders Invoices</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 0; font-size: 14px; }
            .invoice-page { padding: 40px; page-break-after: always; box-sizing: border-box; }
            .invoice-page:last-child { page-break-after: avoid; }
            .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.05); border-radius: 8px; box-sizing: border-box; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            .header-table td { vertical-align: top; }
            .store-name { font-size: 28px; font-weight: bold; color: #6366f1; text-transform: uppercase; margin: 0; }
            .invoice-title { font-size: 24px; font-weight: bold; text-align: right; color: #475569; margin: 0; }
            .invoice-details { text-align: right; font-size: 13px; color: #64748b; margin-top: 10px; }
            .billing-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            .billing-table td { width: 50%; vertical-align: top; }
            .billing-title { font-size: 12px; text-transform: uppercase; font-weight: bold; color: #94a3b8; margin-bottom: 8px; letter-spacing: 1px; }
            .billing-info { line-height: 1.5; color: #1e293b; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; text-align: left; }
            .items-table th { padding: 12px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; font-weight: bold; color: #64748b; }
            .items-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
            .totals-table { width: 300px; margin-left: auto; border-collapse: collapse; font-size: 13px; }
            .totals-table td { padding: 8px 12px; text-align: right; }
            .totals-table tr.total-row { font-size: 16px; font-weight: bold; color: #6366f1; border-top: 2px solid #e2e8f0; }
            .notes-section { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #64748b; line-height: 1.5; }
            .footer { text-align: center; margin-top: 60px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
            @media print {
              body { padding: 0; }
              .invoice-page { padding: 20px; }
              .invoice-box { border: none; box-shadow: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          ${invoicesHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleStatusUpdate = async (orderId: string, newStatus: typeof orders[0]['status']) => {
    await updateOrderStatusInBackend(orderId, newStatus);
    updateOrderStatus(orderId, newStatus);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  const addProductToOrder = (prod: typeof DEMO_PRODUCTS[0]) => {
    const existingIdx = formProducts.findIndex(p => p.code === prod.sku);
    if (existingIdx !== -1) {
      const updated = [...formProducts];
      updated[existingIdx].quantity += 1;
      setFormProducts(updated);
    } else {
      setFormProducts([
        ...formProducts,
        {
          name: prod.name,
          color: 'Default',
          size: 'Free Size',
          code: prod.sku,
          quantity: 1,
          price: prod.price,
        }
      ]);
    }
    setProductSearch('');
    setShowSuggestions(false);
  };

  const handleAddCustomProduct = () => {
    if (!productSearch) return;
    setFormProducts([
      ...formProducts,
      {
        name: productSearch,
        color: 'Default',
        size: 'Free Size',
        code: `CUST-${Math.floor(100 + Math.random() * 900)}`,
        quantity: 1,
        price: 0,
      }
    ]);
    setProductSearch('');
  };

  const updateProductRow = (index: number, field: string, val: any) => {
    const updated = [...formProducts];
    updated[index][field] = val;
    setFormProducts(updated);
  };

  const removeProductRow = (index: number) => {
    const updated = [...formProducts];
    updated.splice(index, 1);
    setFormProducts(updated);
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const subtotal = formProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const amount = subtotal + formDeliveryCharge - formDiscount;
    const itemsCount = formProducts.reduce((sum, p) => sum + p.quantity, 0);

    const orderData = {
      customer: formCustomerName,
      email: formCustomerPhone,
      amount: amount,
      items: itemsCount,
      paymentMethod: formPaymentType === 'cod' ? 'Cash on Delivery' : formPaymentType.toUpperCase(),
      storeName: formStoreName,
      phone: formCustomerPhone,
      address: formCustomerAddress,
      courier: formCourier,
      status: formStatus,
      city: formCity,
      thana: formThana,
      area: formArea,
      customerNote: formCustomerNote,
      shopNote: formShopNote,
      paymentType: formPaymentType,
      memoNumber: formMemoNumber,
      deliveryCharge: formDeliveryCharge,
      discount: formDiscount,
      paidAmount: formPaidAmount,
      subtotal: subtotal,
      productsList: formProducts,
    };

    if (modalMode === 'create') {
      addOrder(orderData);
      await createOrderFromAdminInBackend(orderData);
    } else if (modalMode === 'edit' && editingOrder) {
      const oList = generateOrders();
      const oIdx = oList.findIndex(o => o.id === editingOrder.id);
      if (oIdx !== -1) {
        oList[oIdx] = {
          ...editingOrder,
          ...orderData,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('orderList', JSON.stringify(oList));
      }
      await updateOrderInBackend(editingOrder.id, {
        ...orderData,
        status: formStatus
      });
    }

    const dbOrders = await fetchOrdersFromBackend();
    if (dbOrders !== null) {
      setOrders(dbOrders);
    } else {
      setOrders([...generateOrders()]);
    }
    setModalOpen(false);
  };

  const activeOrders = useMemo(() => {
    return orders;
  }, [orders]);

  const isToday = (dateStr: string) => {
    const orderDate = new Date(dateStr);
    const today = new Date();
    return orderDate.getDate() === today.getDate() &&
           orderDate.getMonth() === today.getMonth() &&
           orderDate.getFullYear() === today.getFullYear();
  };

  const allCount = activeOrders.length;
  const todayCount = useMemo(() => {
    return activeOrders.filter(o => isToday(o.date)).length;
  }, [activeOrders]);

  const filtered = useMemo(() => {
    let result = activeOrders;
    if (filterType === 'today') {
      result = result.filter(o => isToday(o.date));
    } else if (filterType !== 'all') {
      result = result.filter(o => o.status === filterType);
    }
    if (search) {
      const query = search.toLowerCase();
      result = result.filter(o => 
        o.id.toLowerCase().includes(query) || 
        o.customer.toLowerCase().includes(query) ||
        (o.phone && o.phone.toLowerCase().includes(query)) ||
        (o.email && o.email.toLowerCase().includes(query))
      );
    }
    return result;
  }, [activeOrders, filterType, search]);

  const paginated = filtered;
  const totalPages = 1;

  const recentShopNotes = useMemo(() => {
    const notes: string[] = [];
    for (const order of activeOrders) {
      if (order.shopNote && order.shopNote.trim()) {
        const trimmed = order.shopNote.trim();
        if (!notes.includes(trimmed)) {
          notes.push(trimmed);
          if (notes.length >= 5) break;
        }
      }
    }
    return notes;
  }, [activeOrders]);

  const filterConfig = [
    { id: 'all', label: 'All Orders', icon: ShoppingCart, count: activeOrders.length, badgeClass: 'badge-purple' },
    { id: 'today', label: "Today's Orders", icon: Clock, count: activeOrders.filter(o => isToday(o.date)).length, badgeClass: 'badge-info' },
    { id: 'processing', label: 'Processing', icon: RefreshCw, count: activeOrders.filter(o => o.status === 'processing').length, badgeClass: 'badge-info' },
    { id: 'pending', label: 'Pending', icon: Clock, count: activeOrders.filter(o => o.status === 'pending').length, badgeClass: 'badge-warning' },
    { id: 'shipped', label: 'Shipped', icon: Truck, count: activeOrders.filter(o => o.status === 'shipped').length, badgeClass: 'badge-primary' },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle, count: activeOrders.filter(o => o.status === 'delivered').length, badgeClass: 'badge-success' },
    { id: 'cancelled', label: 'Cancelled', icon: XCircle, count: activeOrders.filter(o => o.status === 'cancelled').length, badgeClass: 'badge-danger' },
    { id: 'returned', label: 'Returned', icon: RotateCcw, count: activeOrders.filter(o => o.status === 'returned').length, badgeClass: 'badge-purple' },
  ];

  const getTableTitle = () => {
    switch (filterType) {
      case 'all': return `All Orders (${filtered.length})`;
      case 'today': return `Today's Orders (${filtered.length})`;
      default: return `${filterType.charAt(0).toUpperCase() + filterType.slice(1)} Orders (${filtered.length})`;
    }
  };

  const toggleSelect = (orderId: string) => {
    setSelectedIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const toggleSelectAll = () => {
    const paginatedIds = paginated.map(o => o.id);
    const allSelected = paginatedIds.length > 0 && paginatedIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !paginatedIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const toAdd = paginatedIds.filter(id => !prev.includes(id));
        return [...prev, ...toAdd];
      });
    }
  };

  const handleBulkStatusChange = async (newStatus: typeof orders[0]['status']) => {
    if (selectedIds.length === 0) return;
    await Promise.all(selectedIds.map(id => updateOrderStatusInBackend(id, newStatus)));
    selectedIds.forEach(id => {
      updateOrderStatus(id, newStatus);
    });
    setOrders(prev => prev.map(o => selectedIds.includes(o.id) ? { ...o, status: newStatus } : o));
    setSelectedIds([]);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', width: '100%', height: 'calc(100vh - 120px)', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'rotate 1s linear infinite', margin: '0 auto 16px' }} />
          <p>অর্ডার লিস্ট লোড হচ্ছে...</p>
        </div>
        <style>{`@keyframes rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb"><span>Home</span><span className="page-breadcrumb-sep">/</span><span>Orders</span></div>
          <h1 className="page-title">Order Control Center</h1>
          <p className="page-subtitle">Manage and track all orders in real-time</p>
        </div>
        <div className="page-header-actions">
          {isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={handleSyncOrders}
                disabled={isSyncing}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: isSyncing ? 'rgba(99, 102, 241, 0.15)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  color: '#fff',
                  fontWeight: 600,
                  opacity: isSyncing ? 0.7 : 1,
                  transition: 'all 0.3s ease'
                }}
              >
                <RefreshCw size={15} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
                {isSyncing ? 'Syncing...' : 'Order Sync'}
              </button>
              {syncMessage && (
                <span style={{ 
                  fontSize: '11px', 
                  color: syncMessage.includes('failed') ? '#ef4444' : '#10b981',
                  fontWeight: 500,
                  background: syncMessage.includes('failed') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: syncMessage.includes('failed') ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                  {syncMessage}
                </span>
              )}
            </div>
          )}
          <button className="btn btn-primary" onClick={openCreateModal}><Plus size={16} /> Create Order</button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-6)' }}>
        {filterConfig.map((item, i) => {
          const Icon = item.icon;
          const isActive = filterType === item.id;
          return (
            <div
              key={item.id}
              className="stat-card"
              style={{
                animationDelay: `${i * 0.05}s`,
                cursor: 'pointer',
                border: isActive ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.02)',
                background: isActive ? 'rgba(99, 102, 241, 0.06)' : undefined,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isActive ? '0 4px 20px rgba(99, 102, 241, 0.15)' : 'none',
              }}
              onClick={() => { setFilterType(item.id); setPage(1); }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.2)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Icon size={15} style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-tertiary)' }} />
                <span style={{ fontSize: 'var(--text-xs)', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isActive ? 600 : 500 }}>
                  {item.label}
                </span>
              </div>
              <div className="stat-card-value" style={{ fontSize: 'var(--text-lg)', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{item.count}</span>
                <span className={`badge ${item.badgeClass}`} style={{ fontSize: '8px', padding: '1px 5px', opacity: 0.8 }}>
                  {item.id}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Orders Table */}
      <div className="data-table-container">
        <div className="data-table-header">
          <div className="data-table-title">{getTableTitle()}</div>
          <div className="data-table-actions">
            {selectedIds.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid var(--accent-primary)', padding: '4px 12px', borderRadius: '8px', marginRight: '8px' }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-accent)' }}>{selectedIds.length} Selected</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkStatusChange(e.target.value as any);
                      e.target.value = '';
                    }
                  }}
                  className="form-select"
                  style={{ height: '28px', padding: '0 8px', fontSize: 'var(--text-xs)', background: '#111827', border: '1px solid #1e293b', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}
                  defaultValue=""
                >
                  <option value="" disabled>Bulk Change Status</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="returned">Returned</option>
                </select>
              </div>
            )}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="form-input" style={{ height: '34px', paddingLeft: '32px', width: '220px', fontSize: 'var(--text-xs)' }}
                placeholder="Search orders..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            {filterType === 'shipped' && (
              <button 
                onClick={handlePrintAllShippedOrders} 
                className="btn btn-secondary btn-sm"
                disabled={selectedIds.length === 0}
                style={{ 
                  background: selectedIds.length === 0 ? '#64748b' : '#0284c7', 
                  border: '1px solid ' + (selectedIds.length === 0 ? '#64748b' : '#0284c7'), 
                  color: '#fff', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  opacity: selectedIds.length === 0 ? 0.6 : 1,
                  cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <FileText size={14} /> Print Selected Invoices ({selectedIds.length})
              </button>
            )}
            <button 
              onClick={handleExportOrders} 
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={14} /> Export ({selectedIds.length > 0 ? selectedIds.length : filtered.length})
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '550px' }}>
          <table className="data-table sticky-header">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={paginated.length > 0 && paginated.every(o => selectedIds.includes(o.id))} 
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                  />
                </th>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Items</th>
                <th>Status</th>
                <th>Address</th>
                <th>Date</th>
                <th>Assigned To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((order) => {
                const StatusIcon = statusConfig[order.status]?.icon || Clock;
                return (
                  <tr key={order.id} style={{ background: selectedIds.includes(order.id) ? 'rgba(99, 102, 241, 0.04)' : undefined }}>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(order.id)} 
                        onChange={() => toggleSelect(order.id)}
                        style={{ cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                      />
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-accent)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{order.id}</td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{order.customer}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{order.email}</div>

                        {/* Payment Method & TrxID Badge */}
                        {((order.paymentMethod || order.paymentType || '').toLowerCase().includes('bkash') || (order.memoNumber || '').includes('TrxID')) && (
                          <div style={{ 
                            fontSize: '10px', 
                            fontWeight: 700, 
                            color: '#f43f5e', 
                            background: 'rgba(244, 63, 94, 0.12)', 
                            border: '1px solid rgba(244, 63, 94, 0.3)',
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            marginTop: '4px', 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span>bKash</span>
                            <span>{order.memoNumber || 'Pending'}</span>
                          </div>
                        )}

                        {((order.paymentMethod || order.paymentType || '').toLowerCase().includes('nagad')) && (
                          <div style={{ 
                            fontSize: '10px', 
                            fontWeight: 700, 
                            color: '#f97316', 
                            background: 'rgba(249, 115, 22, 0.12)', 
                            border: '1px solid rgba(249, 115, 22, 0.3)',
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            marginTop: '4px', 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span>Nagad</span>
                            <span>{order.memoNumber || 'Pending'}</span>
                          </div>
                        )}

                        {order.shopNote && (
                          <div style={{ 
                            fontSize: '10px', 
                            color: '#fbbf24', 
                            marginTop: '4px', 
                            background: 'rgba(251, 191, 36, 0.08)', 
                            border: '1px solid rgba(251, 191, 36, 0.15)',
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            display: 'inline-block',
                            maxWidth: '200px',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap'
                          }} title={order.shopNote}>
                            Shop Note: {order.shopNote}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>৳{order.amount.toFixed(2)}</td>
                    <td>
                      {order.productsList && order.productsList.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '200px' }}>
                          {order.productsList.map((p: any, idx: number) => (
                            <div key={idx} style={{ fontSize: '11px', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={`${p.name} (x${p.quantity})`}>
                              {p.name} <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>x{p.quantity}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{order.items} items</span>
                      )}
                    </td>
                    <td>
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusUpdate(order.id, e.target.value as any)}
                        className={`badge ${statusConfig[order.status]?.class}`}
                        style={{
                          border: 'none',
                          outline: 'none',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontFamily: 'inherit',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          appearance: 'none',
                          textAlign: 'center',
                        }}
                      >
                        <option value="pending" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Pending</option>
                        <option value="processing" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Processing</option>
                        <option value="shipped" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Shipped</option>
                        <option value="delivered" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Delivered</option>
                        <option value="cancelled" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Cancelled</option>
                        <option value="returned" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Returned</option>
                      </select>
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', maxWidth: '180px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={order.address || 'N/A'}>
                      {order.address || 'N/A'}
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', lineHeight: '1.5' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ color: 'var(--text-secondary)' }}>
                          <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>Received:</span>{' '}
                          {formatDate(order.date)} {formatTime(order.date)}
                        </div>
                        {order.updatedAt && (
                          <div style={{ color: 'var(--color-success)', fontSize: '10px', marginTop: '2px' }}>
                            <span style={{ color: 'rgba(16, 185, 129, 0.8)', fontWeight: 500 }}>Updated:</span>{' '}
                            {formatDate(order.updatedAt)} {formatTime(order.updatedAt)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {order.assigned_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            color: '#818cf8',
                            background: 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                            cursor: isAdmin ? 'pointer' : 'default'
                          }} onClick={() => isAdmin && setReassigningOrderId(reassigningOrderId === order.id ? null : order.id)}>
                            <Users size={10} />
                            {order.assigned_name}
                          </span>
                          {isAdmin && reassigningOrderId === order.id && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              zIndex: 50,
                              background: 'var(--bg-card)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              padding: '6px',
                              minWidth: '160px',
                              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                              marginTop: '4px'
                            }}>
                              {activeEmployees.map(mod => (
                                <div
                                  key={mod.id}
                                  onClick={() => handleReassignOrder(order.id, mod.id)}
                                  style={{
                                    padding: '6px 10px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                    color: order.assigned_to === mod.id ? '#818cf8' : 'var(--text-secondary)',
                                    fontWeight: order.assigned_to === mod.id ? 600 : 400,
                                    background: order.assigned_to === mod.id ? 'rgba(99,102,241,0.1)' : 'transparent',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = order.assigned_to === mod.id ? 'rgba(99,102,241,0.1)' : 'transparent'; }}
                                >
                                  {mod.name}
                                </div>
                              ))}
                              <div
                                onClick={() => handleReassignOrder(order.id, null)}
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  borderRadius: '4px',
                                  color: '#ef4444',
                                  borderTop: '1px solid rgba(255,255,255,0.05)',
                                  marginTop: '4px'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                              >
                                ✕ Unassign
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          {isAdmin ? (
                            <span 
                              style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dashed' }}
                              onClick={() => setReassigningOrderId(reassigningOrderId === order.id ? null : order.id)}
                            >
                              Unassigned
                            </span>
                          ) : 'Unassigned'}
                          {isAdmin && reassigningOrderId === order.id && !order.assigned_name && (
                            <div style={{
                              position: 'absolute',
                              zIndex: 50,
                              background: 'var(--bg-card)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              padding: '6px',
                              minWidth: '160px',
                              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                              marginTop: '4px'
                            }}>
                              {activeEmployees.map(mod => (
                                <div
                                  key={mod.id}
                                  onClick={() => handleReassignOrder(order.id, mod.id)}
                                  style={{
                                    padding: '6px 10px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                    color: 'var(--text-secondary)',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                  {mod.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(order)}><Eye size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="data-table-footer" style={{ justifyContent: 'center' }}>
          <span>Total {filtered.length} Order{filtered.length !== 1 ? 's' : ''} listed</span>
        </div>
      </div>

      {/* Detail and Create Modal */}
      {modalOpen && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)' }}>
          <div className="modal" style={{ maxWidth: '1400px', width: '95%', maxHeight: '90vh', overflowY: 'auto', background: '#0b0f19', color: '#e2e8f0', borderRadius: '12px', border: '1px solid #1e293b' }} onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="modal-header" style={{ borderBottom: '1px solid #1e293b', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} /> {modalMode === 'create' ? 'Create Order' : `Edit Order - ${formInvoice}`}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {modalMode === 'edit' && (
                  <button
                    type="button"
                    onClick={handlePrintInvoice}
                    className="btn btn-secondary btn-sm"
                    style={{ background: '#1e293b', border: '1px solid #374151', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <FileText size={14} /> Print Invoice
                  </button>
                )}
                <button type="button" onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}>✕</button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveOrder} style={{ padding: '24px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
                alignItems: 'start'
              }}>
                
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#94a3b8' }}>STORE NAME</label>
                      <select value={formStoreName} onChange={(e) => setFormStoreName(e.target.value)} className="form-select" style={{ background: '#111827', border: '1px solid #1e293b', color: '#fff' }}>
                        <option value="GAZI SPORTS 24">GAZI SPORTS 24</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#94a3b8' }}>INVOICE NUMBER</label>
                      <input type="text" value={formInvoice} readOnly className="form-input" style={{ background: '#1f2937', border: '1px solid #1e293b', color: '#94a3b8' }} />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#94a3b8' }}>CUSTOMER NAME <span>*</span></label>
                      <input type="text" value={formCustomerName} onChange={(e) => setFormCustomerName(e.target.value)} required className="form-input" placeholder="Enter Name" style={{ background: '#111827', border: '1px solid #1e293b', color: '#fff' }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#94a3b8' }}>CUSTOMER PHONE <span>*</span></label>
                      <input type="text" value={formCustomerPhone} onChange={(e) => setFormCustomerPhone(e.target.value)} required className="form-input" placeholder="Enter Phone" style={{ background: '#111827', border: '1px solid #1e293b', color: '#fff' }} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ color: '#94a3b8' }}>CUSTOMER ADDRESS <span>*</span></label>
                    <textarea value={formCustomerAddress} onChange={(e) => setFormCustomerAddress(e.target.value)} required className="form-input" placeholder="Enter Address..." style={{ height: '80px', background: '#111827', border: '1px solid #1e293b', color: '#fff', fontFamily: 'inherit' }} />
                  </div>

                  <div className="grid-3">
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#94a3b8' }}>COURIER NAME</label>
                      <select value={formCourier} onChange={(e) => setFormCourier(e.target.value)} className="form-select" style={{ background: '#111827', border: '1px solid #1e293b', color: '#fff' }}>
                        <option value="Pathao">Pathao</option>
                        <option value="Steadfast">Steadfast</option>
                        <option value="RedX">RedX</option>
                        <option value="Paperfly">Paperfly</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#94a3b8' }}>ORDER STATUS</label>
                      <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as any)} className="form-select" style={{ background: '#111827', border: '1px solid #1e293b', color: '#fff' }}>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="returned">Returned</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#94a3b8' }}>ORDER DATE</label>
                      <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="form-input" style={{ background: '#111827', border: '1px solid #1e293b', color: '#fff' }} />
                    </div>
                  </div>

                  <div className="grid-3">
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#94a3b8' }}>DISTRICT NAME</label>
                      <select 
                        value={formCity} 
                        onChange={(e) => {
                          const newCity = e.target.value;
                          setFormCity(newCity);
                          const thanas = BD_DISTRICTS[newCity] || [];
                          setFormThana(thanas.length > 0 ? thanas[0] : '');
                        }} 
                        className="form-select" 
                        style={{ background: '#111827', border: '1px solid #1e293b', color: '#fff' }}
                      >
                        {Object.keys(BD_DISTRICTS).sort().map(dist => (
                          <option key={dist} value={dist}>{dist}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#94a3b8' }}>THANA NAME</label>
                      <select 
                        value={formThana} 
                        onChange={(e) => setFormThana(e.target.value)} 
                        className="form-select" 
                        style={{ background: '#111827', border: '1px solid #1e293b', color: '#fff' }}
                      >
                        <option value="">Select Thana</option>
                        {(BD_DISTRICTS[formCity] || []).sort().map(th => (
                          <option key={th} value={th}>{th}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#94a3b8' }}>AREA NAME</label>
                      <input type="text" value={formArea} onChange={(e) => setFormArea(e.target.value)} className="form-input" placeholder="Select Area" style={{ background: '#111827', border: '1px solid #1e293b', color: '#fff' }} />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#94a3b8' }}>CUSTOMER NOTE</label>
                      <input type="text" value={formCustomerNote} onChange={(e) => setFormCustomerNote(e.target.value)} className="form-input" placeholder="Note for customer..." style={{ background: '#111827', border: '1px solid #1e293b', color: '#fff' }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#94a3b8' }}>SHOP NOTE</label>
                      <input type="text" value={formShopNote} onChange={(e) => setFormShopNote(e.target.value)} className="form-input" placeholder="Note for shop..." style={{ background: '#111827', border: '1px solid #1e293b', color: '#fff' }} />
                      {recentShopNotes.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                          <span style={{ fontSize: '10px', color: '#64748b', alignSelf: 'center' }}>Recent Notes:</span>
                          {recentShopNotes.map((note, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setFormShopNote(note)}
                              style={{
                                fontSize: '10px',
                                background: '#1e293b',
                                border: '1px solid #374151',
                                color: '#94a3b8',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#6366f1';
                                e.currentTarget.style.color = '#fff';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#374151';
                                e.currentTarget.style.color = '#94a3b8';
                              }}
                            >
                              {note}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Search Products */}
                  <div className="form-group" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => { setProductSearch(e.target.value); setShowSuggestions(true); }}
                        onFocus={() => setShowSuggestions(true)}
                        className="form-input"
                        placeholder="Search product name..."
                        style={{ background: '#111827', border: '1px solid #1e293b', color: '#fff' }}
                      />
                      <button type="button" onClick={handleAddCustomProduct} className="btn btn-primary" style={{ minWidth: '80px' }}><Plus size={16} /> Add</button>
                    </div>
                    
                    {/* Suggestions list */}
                    {showSuggestions && productSearch && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#1f2937', border: '1px solid #374151', borderRadius: '4px', marginTop: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                        {(products.length > 0 ? products : DEMO_PRODUCTS).filter((p: any) => p.name.toLowerCase().includes(productSearch.toLowerCase())).map((p: any, idx: number) => (
                          <div
                            key={idx}
                            onClick={() => addProductToOrder(p)}
                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #374151', fontSize: '13px' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#374151'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            {p.name} - ৳{p.price}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Products Table */}
                  <div style={{ border: '1px solid #1e293b', borderRadius: '8px', overflow: 'hidden', background: '#111827', minHeight: '150px', maxHeight: '220px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#0b0f19', color: '#94a3b8', borderBottom: '1px solid #1e293b', textAlign: 'left' }}>
                          <th style={{ padding: '8px' }}>COLOR</th>
                          <th style={{ padding: '8px' }}>SIZE</th>
                          <th style={{ padding: '8px' }}>CODE</th>
                          <th style={{ padding: '8px' }}>PRODUCT NAME</th>
                          <th style={{ padding: '8px', width: '70px' }}>QTY</th>
                          <th style={{ padding: '8px', width: '80px' }}>PRICE</th>
                          <th style={{ padding: '8px', width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formProducts.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>No products added to this order yet.</td>
                          </tr>
                        ) : (
                          formProducts.map((p: any, idx: number) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                              <td style={{ padding: '6px' }}>
                                <input type="text" value={p.color || ''} onChange={(e) => updateProductRow(idx, 'color', e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff' }} />
                              </td>
                              <td style={{ padding: '6px' }}>
                                <input type="text" value={p.size || ''} onChange={(e) => updateProductRow(idx, 'size', e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff' }} />
                              </td>
                              <td style={{ padding: '6px', color: '#94a3b8' }}>{p.code}</td>
                              <td style={{ padding: '6px', color: '#fff' }}>{p.name}</td>
                              <td style={{ padding: '6px' }}>
                                <input type="number" min="1" value={p.quantity} onChange={(e) => updateProductRow(idx, 'quantity', parseInt(e.target.value) || 1)} style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', textAlign: 'center' }} />
                              </td>
                              <td style={{ padding: '6px' }}>
                                <input type="number" step="0.01" value={p.price} onChange={(e) => updateProductRow(idx, 'price', parseFloat(e.target.value) || 0)} style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff' }} />
                              </td>
                              <td style={{ padding: '6px', textAlign: 'center' }}>
                                <button type="button" onClick={() => removeProductRow(idx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Payment and Memo */}
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#94a3b8' }}>PAYMENT</label>
                      <select value={formPaymentType} onChange={(e) => setFormPaymentType(e.target.value)} className="form-select" style={{ background: '#111827', border: '1px solid #1e293b', color: '#fff' }}>
                        <option value="cod">Cash on Delivery</option>
                        <option value="bkash">bKash</option>
                        <option value="nagad">Nagad</option>
                        <option value="card">Card</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ color: '#94a3b8' }}>MEMO NUMBER</label>
                      <input type="text" value={formMemoNumber} onChange={(e) => setFormMemoNumber(e.target.value)} className="form-input" placeholder="Enter Memo Number" style={{ background: '#111827', border: '1px solid #1e293b', color: '#fff' }} />
                    </div>
                  </div>

                  {/* Pricing Details Panel */}
                  <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>Sub Total</span>
                      <span style={{ fontWeight: 600 }}>৳{formProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>Delivery Charge</span>
                      <input type="number" value={formDeliveryCharge} onChange={(e) => setFormDeliveryCharge(parseFloat(e.target.value) || 0)} style={{ width: '80px', background: '#1f2937', border: '1px solid #1e293b', color: '#fff', textAlign: 'right', padding: '4px 8px', borderRadius: '4px' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>Apply Coupon</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input 
                          type="text" 
                          placeholder="Code" 
                          value={couponCodeInput} 
                          onChange={(e) => setCouponCodeInput(e.target.value)} 
                          style={{ width: '80px', background: '#1f2937', border: '1px solid #1e293b', color: '#fff', textAlign: 'right', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }} 
                        />
                        <button 
                          type="button" 
                          onClick={handleApplyAdminCoupon} 
                          style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                    {couponMsg && (
                      <div style={{ fontSize: '11px', color: couponMsg.includes('Applied') ? '#10b981' : '#ef4444', textAlign: 'right', marginTop: '-6px' }}>
                        {couponMsg}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>Discount</span>
                      <input type="number" value={formDiscount} onChange={(e) => setFormDiscount(parseFloat(e.target.value) || 0)} style={{ width: '80px', background: '#1f2937', border: '1px solid #1e293b', color: '#fff', textAlign: 'right', padding: '4px 8px', borderRadius: '4px' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>Paid Amount</span>
                      <input type="number" value={formPaidAmount} onChange={(e) => setFormPaidAmount(parseFloat(e.target.value) || 0)} style={{ width: '80px', background: '#1f2937', border: '1px solid #1e293b', color: '#fff', textAlign: 'right', padding: '4px 8px', borderRadius: '4px' }} />
                    </div>
                    <div style={{ borderTop: '1px solid #1e293b', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>Total</span>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: '#6366f1' }}>
                        ৳{(formProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0) + formDeliveryCharge - formDiscount).toFixed(2)}
                      </span>
                    </div>
                  </div>

                </div>

              </div>

              {/* Order History Timeline at the bottom */}
              {modalMode === 'edit' && (
                <div style={{
                  background: 'rgba(15, 23, 42, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginTop: '24px',
                  boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)'
                }}>
                  <h4 style={{ 
                    fontSize: '15px', 
                    fontWeight: 600, 
                    color: '#38bdf8', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    borderBottom: '1px solid rgba(255,255,255,0.05)', 
                    paddingBottom: '12px',
                    marginBottom: '16px',
                    margin: 0
                  }}>
                    <History size={18} /> Order History Timeline & Log Audit
                  </h4>

                  {orderHistory.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: '12px', fontStyle: 'italic', padding: '16px 0', textAlign: 'center' }}>
                      No history logs found for this order.
                    </div>
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'row', 
                      gap: '16px', 
                      overflowX: 'auto', 
                      paddingBottom: '12px', 
                      marginTop: '12px',
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(99, 102, 241, 0.3) rgba(15, 23, 42, 0.2)'
                    }}>
                      {orderHistory.map((log) => {
                        let dotColor = '#10b981'; // green for create
                        let eventTitle = 'Event';
                        let description = '';

                        if (log.action_type === 'create') {
                          dotColor = '#10b981';
                          eventTitle = 'Order Created';
                          description = 'Order was placed & marked as processing.';
                        } else if (log.action_type === 'status_change') {
                          dotColor = '#6366f1'; // blue/indigo
                          eventTitle = 'Status Updated';
                          description = `${log.old_value || 'N/A'} ➔ ${log.new_value}`;
                        } else if (log.action_type === 'assignment') {
                          dotColor = '#818cf8'; // purple
                          eventTitle = 'Assignee Updated';
                          description = log.new_value === 'Unassigned' 
                            ? `Unassigned (previously: ${log.old_value || 'None'})` 
                            : `Assigned to ${log.new_value}`;
                        } else if (log.action_type === 'shop_note') {
                          dotColor = '#f59e0b'; // amber/orange
                          eventTitle = 'Shop Note Added';
                          description = log.new_value 
                            ? `Note: "${log.new_value}"` 
                            : 'Shop note was cleared.';
                        }

                        return (
                          <div 
                            key={log.id} 
                            style={{ 
                              background: 'rgba(30, 41, 59, 0.4)', 
                              border: '1px solid rgba(255, 255, 255, 0.05)', 
                              borderRadius: '8px', 
                              padding: '12px 16px',
                              display: 'flex',
                              alignItems: 'start',
                              gap: '12px',
                              position: 'relative',
                              transition: 'all 0.2s',
                              overflow: 'hidden',
                              flexShrink: 0,
                              width: '280px'
                            }}
                          >
                            {/* Accent indicator line */}
                            <div style={{ width: '4px', position: 'absolute', top: 0, bottom: 0, left: 0, background: dotColor }} />
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, paddingLeft: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, color: '#fff', fontSize: '12px' }}>{eventTitle}</span>
                                <span style={{ color: '#64748b', fontSize: '9px' }}>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div style={{ color: '#94a3b8', fontSize: '11px', wordBreak: 'break-word', marginTop: '2px', lineHeight: '1.4' }}>{description}</div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '10px', color: '#64748b' }}>
                                <span>by {log.performed_by}</span>
                                <span>{new Date(log.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px', borderTop: '1px solid #1e293b', paddingTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', maxWidth: '400px', height: '44px', fontSize: '16px', fontWeight: 600, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>SAVE</button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
