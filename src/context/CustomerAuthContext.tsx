import React, { createContext, useContext, useState, useEffect } from 'react';

export interface SavedAddress {
  id: string;
  label: string; // e.g., 'Home', 'Office'
  name: string;
  phone: string;
  address: string;
  isDefault?: boolean;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  avatar?: string;
  createdAt: string;
  addresses?: SavedAddress[];
}

interface CustomerAuthContextType {
  customer: CustomerProfile | null;
  customers: CustomerProfile[];
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, phone: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateCustomerPhone: (phone: string) => Promise<void>;
  updateCustomerProfile: (profileData: { name: string; phone: string; address: string }) => Promise<void>;
  addCustomerAddress: (address: Omit<SavedAddress, 'id'>) => Promise<void>;
  updateCustomerAddress: (addressId: string, address: Partial<SavedAddress>) => Promise<void>;
  deleteCustomerAddress: (addressId: string) => Promise<void>;
  setDefaultCustomerAddress: (addressId: string) => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isVitePort = window.location.port === '5173' || window.location.port === '5175' || window.location.port === '5174';

const API_BASE = isLocalDev && isVitePort
  ? 'http://localhost:5000/api/v1/customers'
  : '/api/v1/customers';

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('customer_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize customer session and fetch fresh profile from database
  useEffect(() => {
    // Keep local offline list cached
    const storedCustomers = localStorage.getItem('storefront_customers');
    if (storedCustomers) {
      try {
        setCustomers(JSON.parse(storedCustomers));
      } catch (e) {}
    }

    const fetchProfile = async () => {
      const token = localStorage.getItem('customer_token');
      if (token) {
        try {
          const response = await fetch(`${API_BASE}/profile`, {
            headers: getAuthHeaders()
          });
          if (response.ok) {
            const res = await response.json();
            if (res.status === 'success') {
              setCustomer(res.data);
              localStorage.setItem('storefront_active_customer', JSON.stringify(res.data));
            } else {
              localStorage.removeItem('customer_token');
              localStorage.removeItem('storefront_active_customer');
              setCustomer(null);
            }
          }
        } catch (e) {
          console.warn('Backend server offline, loading customer from localStorage cache');
          const cached = localStorage.getItem('storefront_active_customer');
          if (cached) {
            try {
              setCustomer(JSON.parse(cached));
            } catch (e) {}
          }
        }
      } else {
        const cached = localStorage.getItem('storefront_active_customer');
        if (cached) {
          try {
            setCustomer(JSON.parse(cached));
          } catch (e) {}
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const res = await response.json();
      if (res.status === 'success') {
        localStorage.setItem('customer_token', res.data.token);
        localStorage.setItem('storefront_active_customer', JSON.stringify(res.data.customer));
        setCustomer(res.data.customer);
        return { success: true };
      } else {
        return { success: false, error: res.message || 'আপনার ইমেইল অথবা পাসওয়ার্ডটি সঠিক নয়' };
      }
    } catch (e) {
      console.warn('Backend offline, fallback login check');
      const found = customers.find(c => c.email.toLowerCase() === email.toLowerCase());
      if (found) {
        localStorage.setItem('storefront_active_customer', JSON.stringify(found));
        setCustomer(found);
        return { success: true };
      }
      return { success: false, error: 'সার্ভারে সংযোগ করা যাচ্ছে না।' };
    }
  };

  const register = async (name: string, email: string, password: string, phone: string) => {
    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone })
      });
      const res = await response.json();
      if (res.status === 'success') {
        localStorage.setItem('customer_token', res.data.token);
        localStorage.setItem('storefront_active_customer', JSON.stringify(res.data.customer));
        setCustomer(res.data.customer);
        return { success: true };
      } else {
        return { success: false, error: res.message || 'নিবন্ধন ব্যর্থ হয়েছে।' };
      }
    } catch (e) {
      console.warn('Backend offline, fallback register');
      const newCustomer: CustomerProfile = {
        id: `cust-${Date.now()}`,
        name,
        email,
        phone,
        avatar: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
        createdAt: new Date().toISOString(),
        addresses: []
      };

      const updated = [...customers, newCustomer];
      localStorage.setItem('storefront_customers', JSON.stringify(updated));
      localStorage.setItem('storefront_active_customer', JSON.stringify(newCustomer));
      setCustomers(updated);
      setCustomer(newCustomer);
      return { success: true };
    }
  };

  const logout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('storefront_active_customer');
    setCustomer(null);
  };

  const updateCustomerPhone = async (phone: string) => {
    if (!customer) return;
    const updatedCustomer = { ...customer, phone };
    setCustomer(updatedCustomer);
    localStorage.setItem('storefront_active_customer', JSON.stringify(updatedCustomer));
    
    try {
      await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ name: customer.name, phone })
      });
    } catch (e) {}
  };

  const updateCustomerProfile = async (profileData: { name: string; phone: string; address: string }) => {
    if (!customer) return;
    const updatedCustomer = { ...customer, ...profileData };
    setCustomer(updatedCustomer);
    localStorage.setItem('storefront_active_customer', JSON.stringify(updatedCustomer));

    try {
      await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(profileData)
      });
    } catch (e) {}
  };

  const addCustomerAddress = async (addressData: Omit<SavedAddress, 'id'>) => {
    if (!customer) return;
    
    try {
      const response = await fetch(`${API_BASE}/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(addressData)
      });
      const res = await response.json();
      if (res.status === 'success') {
        const newAddress: SavedAddress = res.data;
        let updatedAddresses = customer.addresses ? [...customer.addresses] : [];
        if (newAddress.isDefault) {
          updatedAddresses = updatedAddresses.map(addr => ({ ...addr, isDefault: false }));
        }
        updatedAddresses.push(newAddress);
        
        const updatedCustomer = { ...customer, addresses: updatedAddresses };
        setCustomer(updatedCustomer);
        localStorage.setItem('storefront_active_customer', JSON.stringify(updatedCustomer));
      }
    } catch (e) {
      console.warn('Fallback offline address add');
      const newAddress: SavedAddress = {
        ...addressData,
        id: `addr-${Date.now()}`,
        isDefault: !customer.addresses || customer.addresses.length === 0 ? true : addressData.isDefault
      };
      let updatedAddresses = customer.addresses ? [...customer.addresses] : [];
      if (newAddress.isDefault) {
        updatedAddresses = updatedAddresses.map(addr => ({ ...addr, isDefault: false }));
      }
      updatedAddresses.push(newAddress);
      const updatedCustomer = { ...customer, addresses: updatedAddresses };
      setCustomer(updatedCustomer);
      localStorage.setItem('storefront_active_customer', JSON.stringify(updatedCustomer));
    }
  };

  const updateCustomerAddress = async (addressId: string, addressData: Partial<SavedAddress>) => {
    if (!customer || !customer.addresses) return;

    try {
      const response = await fetch(`${API_BASE}/addresses/${addressId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(addressData)
      });
      if (response.ok) {
        let updatedAddresses = customer.addresses.map(addr => {
          if (addr.id === addressId) {
            return { ...addr, ...addressData };
          }
          return addr;
        });

        if (addressData.isDefault) {
          updatedAddresses = updatedAddresses.map(addr => 
            addr.id === addressId ? { ...addr, isDefault: true } : { ...addr, isDefault: false }
          );
        }

        const updatedCustomer = { ...customer, addresses: updatedAddresses };
        setCustomer(updatedCustomer);
        localStorage.setItem('storefront_active_customer', JSON.stringify(updatedCustomer));
      }
    } catch (e) {
      console.warn('Fallback offline address update');
      let updatedAddresses = customer.addresses.map(addr => {
        if (addr.id === addressId) {
          return { ...addr, ...addressData };
        }
        return addr;
      });
      if (addressData.isDefault) {
        updatedAddresses = updatedAddresses.map(addr => 
          addr.id === addressId ? { ...addr, isDefault: true } : { ...addr, isDefault: false }
        );
      }
      const updatedCustomer = { ...customer, addresses: updatedAddresses };
      setCustomer(updatedCustomer);
      localStorage.setItem('storefront_active_customer', JSON.stringify(updatedCustomer));
    }
  };

  const deleteCustomerAddress = async (addressId: string) => {
    if (!customer || !customer.addresses) return;

    try {
      const response = await fetch(`${API_BASE}/addresses/${addressId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const addressToDelete = customer.addresses.find(addr => addr.id === addressId);
        let updatedAddresses = customer.addresses.filter(addr => addr.id !== addressId);

        if (addressToDelete?.isDefault && updatedAddresses.length > 0) {
          updatedAddresses[0].isDefault = true;
        }

        const updatedCustomer = { ...customer, addresses: updatedAddresses };
        setCustomer(updatedCustomer);
        localStorage.setItem('storefront_active_customer', JSON.stringify(updatedCustomer));
      }
    } catch (e) {
      console.warn('Fallback offline address delete');
      const addressToDelete = customer.addresses.find(addr => addr.id === addressId);
      let updatedAddresses = customer.addresses.filter(addr => addr.id !== addressId);
      if (addressToDelete?.isDefault && updatedAddresses.length > 0) {
        updatedAddresses[0].isDefault = true;
      }
      const updatedCustomer = { ...customer, addresses: updatedAddresses };
      setCustomer(updatedCustomer);
      localStorage.setItem('storefront_active_customer', JSON.stringify(updatedCustomer));
    }
  };

  const setDefaultCustomerAddress = async (addressId: string) => {
    if (!customer || !customer.addresses) return;

    try {
      const response = await fetch(`${API_BASE}/addresses/${addressId}/default`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const updatedAddresses = customer.addresses.map(addr => ({
          ...addr,
          isDefault: addr.id === addressId
        }));

        const updatedCustomer = { ...customer, addresses: updatedAddresses };
        setCustomer(updatedCustomer);
        localStorage.setItem('storefront_active_customer', JSON.stringify(updatedCustomer));
      }
    } catch (e) {
      console.warn('Fallback offline address set default');
      const updatedAddresses = customer.addresses.map(addr => ({
        ...addr,
        isDefault: addr.id === addressId
      }));
      const updatedCustomer = { ...customer, addresses: updatedAddresses };
      setCustomer(updatedCustomer);
      localStorage.setItem('storefront_active_customer', JSON.stringify(updatedCustomer));
    }
  };

  return (
    <CustomerAuthContext.Provider value={{ 
      customer, 
      customers, 
      loading, 
      login, 
      register, 
      logout, 
      updateCustomerPhone, 
      updateCustomerProfile,
      addCustomerAddress,
      updateCustomerAddress,
      deleteCustomerAddress,
      setDefaultCustomerAddress
    }}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};
