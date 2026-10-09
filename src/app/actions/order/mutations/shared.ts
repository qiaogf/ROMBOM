// Shared helpers for order mutation sub-modules (NOT a server-action module:
// exports a sync function, so must not carry "use server").

import type { CreateOrderData } from "../shared";

/** Validate order shipping/payment form data. */
export function validateOrderData(data: CreateOrderData): { valid: boolean; message: string } {
  if (!data.shippingCountry || !data.shippingCountry.trim()) {
    return { valid: false, message: "Shipping country is required" };
  }
  if (!/^[A-Z]{2}$/.test(data.shippingCountry.trim().toUpperCase())) {
    return { valid: false, message: "Invalid country code" };
  }
  if (data.shippingCity && data.shippingCity.length > 100) {
    return { valid: false, message: "City name is too long" };
  }
  if (data.shippingAddress && data.shippingAddress.length > 200) {
    return { valid: false, message: "Address is too long" };
  }
  if (data.shippingZip && data.shippingZip.length > 20) {
    return { valid: false, message: "ZIP/Postal code is too long" };
  }
  if (data.shippingName && data.shippingName.length > 100) {
    return { valid: false, message: "Name is too long" };
  }
  if (data.shippingPhone && data.shippingPhone.length > 30) {
    return { valid: false, message: "Phone number is too long" };
  }
  if (data.notes && data.notes.length > 500) {
    return { valid: false, message: "Order notes are too long" };
  }

  return { valid: true, message: "" };
}
