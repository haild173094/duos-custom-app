import { createContext } from 'preact';
import type { ICompanyLocation } from '@app/types';

const CompanyLocation = createContext<ICompanyLocation | null>(null);

export default CompanyLocation;
