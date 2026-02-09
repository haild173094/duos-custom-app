import { useContext } from 'preact/hooks';
import { createContext } from 'preact';
import type { ICustomerContext } from '@app/types';

export const CustomerContext = createContext<ICustomerContext | null>(null);
export const UpdateCustomerContext = createContext<Function | null>(null);

export function useCustomer() {
  const customer = useContext(CustomerContext);

  return customer;
}
