import { supabase } from './supabase';
import type { Product, ProductInteraction, MemoryEvent, WarrantyClaim, Notification } from './types';
import { computeWarrantyStatus } from './agent';

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchProduct(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createProduct(input: {
  name: string;
  brand: string;
  category: string;
  model_number?: string;
  serial_number?: string;
  purchase_date?: string;
  warranty_duration_months?: number;
  seller?: string;
  image_url?: string;
  notes?: string;
}): Promise<Product> {
  const purchaseDate = input.purchase_date ? new Date(input.purchase_date) : new Date();
  const months = input.warranty_duration_months ?? 12;
  const expiry = new Date(purchaseDate);
  expiry.setMonth(expiry.getMonth() + months);
  const warrantyStatus = computeWarrantyStatus(expiry.toISOString().split('T')[0]);

  const { data, error } = await supabase
    .from('products')
    .insert({
      name: input.name,
      brand: input.brand,
      category: input.category,
      model_number: input.model_number ?? null,
      serial_number: input.serial_number ?? null,
      purchase_date: input.purchase_date ?? purchaseDate.toISOString().split('T')[0],
      warranty_duration_months: months,
      warranty_expiry: expiry.toISOString().split('T')[0],
      seller: input.seller ?? null,
      image_url: input.image_url ?? null,
      warranty_status: warrantyStatus,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  // Record initial memory
  await supabase.from('memory_events').insert({
    product_id: data.id,
    layer: 'RETAIN',
    label: 'Product registered',
    description: `${input.brand} ${input.name} registered with ${months}-month warranty.`,
  });

  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchInteractions(productId: string): Promise<ProductInteraction[]> {
  const { data, error } = await supabase
    .from('product_interactions')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMemoryEvents(productId: string): Promise<MemoryEvent[]> {
  const { data, error } = await supabase
    .from('memory_events')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchClaims(productId: string): Promise<WarrantyClaim[]> {
  const { data, error } = await supabase
    .from('warranty_claims')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('id', id);
}

export async function refreshWarrantyStatuses(): Promise<void> {
  const { data: products } = await supabase.from('products').select('id, warranty_expiry');
  if (!products) return;
  for (const p of products) {
    const status = computeWarrantyStatus(p.warranty_expiry);
    await supabase.from('products').update({ warranty_status: status }).eq('id', p.id);
  }
}
