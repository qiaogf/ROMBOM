"use client";

import { useState, useEffect, useCallback } from "react";
import { getCartItemCount } from "@/app/actions/cartActions";

export function useCart() {
  const [itemCount, setItemCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCount = useCallback(async () => {
    try {
      const count = await getCartItemCount();
      setItemCount(count);
    } catch (e) {
      setItemCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  const refreshCart = useCallback(() => {
    setIsLoading(true);
    fetchCount();
  }, [fetchCount]);

  return { itemCount, isLoading, refreshCart };
}