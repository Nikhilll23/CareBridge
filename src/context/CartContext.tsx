'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { toast } from 'sonner'

export interface CartItem {
    id: string
    name: string
    price: number
    quantity: number
    manufacturer?: string
    genericName?: string
}

interface CartContextType {
    cart: CartItem[]
    addToCart: (item: CartItem) => void
    removeFromCart: (id: string) => void
    updateQuantity: (id: string, quantity: number) => void
    clearCart: () => void
    totalAmount: string
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
    // Initialize from local storage if available, else empty
    const [cart, setCart] = useState<CartItem[]>([])
    const [isInitialized, setIsInitialized] = useState(false)

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('his-pharmacy-cart')
        if (saved) {
            try {
                setCart(JSON.parse(saved))
            } catch (e) {
                console.error('Failed to load cart', e)
            }
        }
        setIsInitialized(true)
    }, [])

    // Save to localStorage whenever cart changes
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem('his-pharmacy-cart', JSON.stringify(cart))
        }
    }, [cart, isInitialized])

    const addToCart = (item: CartItem) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id)
            if (existing) {
                toast.success(`Increased quantity of ${item.name}`)
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
            }
            toast.success(`Added ${item.name} to cart`)
            return [...prev, { ...item, quantity: 1 }]
        })
    }

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(i => i.id !== id))
    }

    const updateQuantity = (id: string, quantity: number) => {
        if (quantity < 1) {
            removeFromCart(id)
            return
        }
        setCart(prev => prev.map(i => i.id === id ? { ...i, quantity } : i))
    }

    const clearCart = () => setCart([])

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, totalAmount }}>
            {children}
        </CartContext.Provider>
    )
}

export const useCart = () => {
    const context = useContext(CartContext)
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider')
    }
    return context
}
