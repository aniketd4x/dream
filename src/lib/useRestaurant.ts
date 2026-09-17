// lib/useRestaurant.ts
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';

export function useRestaurant() {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRestaurant() {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name')
        .eq('email', user.email)
        .maybeSingle();

      if (error) {
        console.error('Error fetching restaurant:', error);
      } else if (data) {
        setRestaurant(data as { id: string; name: string });
      }
      setLoading(false);
    }

    fetchRestaurant();
  }, [user]);

  return { restaurant, loading };
}