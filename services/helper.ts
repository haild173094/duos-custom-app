import { addDays, isAfter, isValid, parseISO } from "date-fns";
import { IShoppingListFields } from "../types";

export const randomId = () => Math.floor(100000 + Math.random() * 900000);

export const formatDate = (timestamp: string | number | Date, locale?: string) => {
  return new Intl.DateTimeFormat(locale || 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(timestamp));
};

export const convertCsvToArray = (string: string) => {
  if (!string) return [];

  const delimiter = string.includes(';') && string.split(';').length > string.split(',').length ? ';' : ',';

  const rows = string.trim().split('\n');

  const headers = splitCsvRow(rows[0], delimiter);
  const dataRows = rows.slice(1);

  return dataRows.map(row => {
    const values = splitCsvRow(row, delimiter);
    return headers.reduce((acc, header, i) => {
      let value = values[i] ? values[i].trim() : '';

      if (/^\d+(\.\d+)?E[\+\-]?\d+$/i.test(value)) {
        value = Number(value).toString();
      }

      if (/^0\d+/.test(value)) {
        value = `"${value}"`;
      }

      acc[header] = value;
      return acc;
    }, {} as Record<string, string>);
  });
};

const splitCsvRow = (row: string, delimiter: string): string[] => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];

    if (char === '"' && (i === 0 || row[i - 1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  return values.map(value => value.replace(/^"|"$/g, '').replace(/""/g, '"'));
};

const CSV_HEADER = {
  productId: 'Product ID',
  productName: 'Product Name',
  variantId: 'Variant ID',
  variantName: 'Variant Name',
  variantSku: 'Variant SKU',
  minimum: 'Minimum',
  maximum: 'Maximum',
  increment: 'Increment',
  quantity: 'Quantity',
  price: 'Price',
  image: 'Image',
}

export const convertCsvArrayToLineItems = (data: any[]) => {
  if (data.length <= 0) {
    return null;
  }

  return data.map((item, index) => ({
    productId: item[CSV_HEADER.productId],
    productName: item[CSV_HEADER.productName],
    variantId: item[CSV_HEADER.variantId],
    variantName: item[CSV_HEADER.variantName],
    variantSku: item[CSV_HEADER.variantSku],
    minimum: item[CSV_HEADER.minimum] !== undefined && item[CSV_HEADER.minimum] !== null && item[CSV_HEADER.minimum] !== ""
      ? parseInt(item[CSV_HEADER.minimum], 10)
      : "",
    maximum: item[CSV_HEADER.maximum] !== undefined && item[CSV_HEADER.maximum] !== null && item[CSV_HEADER.maximum] !== ""
      ? parseInt(item[CSV_HEADER.maximum], 10)
      : "",
    increment: item[CSV_HEADER.increment] !== undefined && item[CSV_HEADER.increment] !== null && item[CSV_HEADER.increment] !== ""
      ? parseInt(item[CSV_HEADER.increment], 10)
      : "",
    quantity: item[CSV_HEADER.quantity] !== undefined && item[CSV_HEADER.quantity] !== null && item[CSV_HEADER.quantity] !== ""
      ? parseInt(item[CSV_HEADER.quantity], 10)
      : "",
    price: item[CSV_HEADER.price] !== undefined && item[CSV_HEADER.price] !== null && item[CSV_HEADER.price] !== ""
      ? parseInt(item[CSV_HEADER.price], 10)
      : "",
    image: item[CSV_HEADER.image],
  }));
}

export const validateCsv = (text: string) => {
  const errors = [];
  const requiredColumns = [
    CSV_HEADER.productId,
    CSV_HEADER.productName,
    CSV_HEADER.variantId,
    CSV_HEADER.variantName,
    CSV_HEADER.variantSku,
    CSV_HEADER.minimum,
    CSV_HEADER.maximum,
    CSV_HEADER.increment,
    CSV_HEADER.quantity,
  ];
  const requiredFields = [
    CSV_HEADER.productId,
    CSV_HEADER.productName,
    CSV_HEADER.variantId,
    CSV_HEADER.variantName,
    CSV_HEADER.minimum,
    CSV_HEADER.increment,
  ];
  const requiredNumberFields = requiredFields.filter(col =>
    [CSV_HEADER.minimum, CSV_HEADER.maximum, CSV_HEADER.increment, CSV_HEADER.quantity, CSV_HEADER.price].includes(col)
  );

  const lines = text.trim().split("\n");

  if (lines.length <= 1) {
    errors.push({ errorType: "csv", errorKey: 'empty_file' });
    return errors;
  }

  const delimiter = text.includes(";") && text.split(";").length > text.split(",").length ? ";" : ",";

  const headers = splitCsvRow(lines[0], delimiter);

  const missingColumns = requiredColumns.filter((col) => !headers.includes(col));
  if (missingColumns.length > 0) {
    errors.push({ errorType: "csv", errorKey: 'missing_required_columns', params: [{key: 'missingColumns', value: missingColumns.join(", ")}] });
  }

  const missingFields = new Set();
  const invalidNumberFields = new Set();
  let hasInvalidQuotes = false;

  for (let i = 1; i < lines.length; i++) {
    const row = splitCsvRow(lines[i], delimiter);

    const quoteCount = (lines[i].match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      hasInvalidQuotes = true;
    }

    requiredFields.forEach((col) => {
      const index = headers.indexOf(col);
      if (index !== -1 && (!row[index] || row[index] === "")) {
        missingFields.add(col);
      }
    });

    requiredNumberFields.forEach((col) => {
      const index = headers.indexOf(col);
      if (index !== -1 && row[index]) {
        const value = parseInt(row[index], 10);
        if (isNaN(value) || value <= 0) {
          invalidNumberFields.add(col);
        }
      }
    });
  }

  if (hasInvalidQuotes) {
    errors.push({ errorType: "csv", errorKey: 'invalid_format' });
  }

  if (missingFields.size > 0) {
    errors.push({ errorType: "csv", errorKey: 'missing_required_values_columns', params: [{key: 'missingFields', value: Array.from(missingFields).join(", ")}] });
  }

  if (invalidNumberFields.size > 0) {
    errors.push({ errorType: "csv", errorKey: 'invalid_values_columns', params: [{key: 'invalidNumberFields', value: Array.from(invalidNumberFields).join(", ")}] });
  }

  return errors;
};

export const validateLineItems = (lineItems: any[], variants: any[]) => {
  const lineItemErrors = [];
  const seenItems = new Set();

  lineItems.forEach(item => {
    const variant = variants.find(v => v.id.endsWith(item.variantId));
    item.errors = [];

    if (!variant) {
      const error = { errorType: 'lineItem', errorKey: 'no_product' };
      item.errors.push(error);
      lineItemErrors.push({ item, ...error });
      return;
    }

    // Update fields from variant
    item.availableStock = variant.inventory_quantity ?? '';
    const quantityRule = variant.contextual_pricing?.quantity_rule;
    item.maximum = quantityRule?.maximum ?? '';
    item.minimum = quantityRule?.minimum ?? '';
    item.increment = quantityRule?.increment ?? '';
    const amount = +variant.contextual_pricing?.price?.amount || 0;
    item.price = amount % 1 ? amount : Math.round(amount);
    item.inventoryPolicy = variant.inventory_policy;
    item.image = variant?.product.featured_media?.preview?.image?.url

    if (!variant.product.published_in_context) {
      const error = { errorType: 'lineItem', errorKey: 'not_available' };
      item.errors.push(error);
      lineItemErrors.push({ item, ...error });
    }

    if (seenItems.has(item.variantId)) {
      const error = { errorType: 'lineItem', errorKey: 'duplicate_product' };
      item.errors.push(error);
      lineItemErrors.push({ item, ...error });
    } else {
      seenItems.add(item.variantId);
    }

    if (quantityRule) {
      if (item.quantity < quantityRule.minimum) {
        const error = { errorType: 'lineItem', errorKey: 'below_min_quantity' };
        item.errors.push(error);
        lineItemErrors.push({ item, ...error });
      }

      if (quantityRule.maximum !== null && item.quantity > quantityRule.maximum) {
        const error = { errorType: 'lineItem', errorKey: 'exceed_max_quantity' };
        item.errors.push(error);
        lineItemErrors.push({ item, ...error });
      }

      if (quantityRule.increment && (item.quantity - quantityRule.minimum) % quantityRule.increment !== 0) {
        const error = { errorType: 'lineItem', errorKey: 'not_follow_increment' };
        item.errors.push(error);
        lineItemErrors.push({ item, ...error });
      }
    }

    if (variant.inventory_policy === "DENY" && item.quantity > variant.inventory_quantity) {
      const error = { errorType: 'lineItem', errorKey: 'exceed_inventory' };
      item.errors.push(error);
      lineItemErrors.push({ item, ...error });
    }
  });

  return { validatedLineItems: lineItems, lineItemErrors };
}

const svgToBase64 = (svgString: string) => {
  const prefix = 'data:image/svg+xml;base64,';

  // Encode the SVG string to base64 safely
  const encoded = btoa(
    encodeURIComponent(svgString).replace(
      /%([0-9A-F]{2})/g,
      (_, p1) => String.fromCharCode(parseInt(p1, 16))
    )
  );

  return prefix + encoded;
};

export const hexCodeToImage = (hexColor: string) => {
  const svg = `
    <svg width="10" height="5" xmlns="http://www.w3.org/2000/svg">
      <rect width="10" height="5" fill="hsl(0, 0%, 90%)" />
      <rect width="10" height="5" fill="${hexColor}" />
    </svg>
  `;

  return svgToBase64(svg);
};

export const removeEmpty = (obj: Record<string, any>) => {
  if (!obj) return {};

  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v));
};

export const isEmptyObj = (obj?: Record<any, any>) => {
  return !obj || Object.keys(obj).length === 0;
};

export const extractId = (id: string): string => id.split('/').pop() || '';

export const translateErrorsText = (errors: Record<string, any>[] = [], contents: Record<string, string> = {}) => {
  return errors.map((error: Record<string, any>) => {
    let errorText = contents[error.errorKey] || "";
    if (error?.params?.length) {
      error.params.forEach(({ key, value }) => {
        const placeholder = `{{${key}}}`;
        // errorText = errorText.replace(new RegExp(placeholder, "g"), value);
        errorText = errorText.split(placeholder).join(value);
      });
    }
    return {
      ...error,
      errorText,
    }
  });
}

export const truncate = (
  text: string, size: number = 20,
) => (text && text.length > size) ? `${text.slice(0, size)}...` : text;

export function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const isExpired = (quote: Record<string, any>) => {
  const today = new Date();

  if (quote?.expires_at) {
    const expiresAt = parseISO(quote?.expires_at);
    if (isValid(expiresAt)) {
      return !isAfter(expiresAt, today);
    }
  }

  if (quote?.created_at) {
    const createdAt = parseISO(quote?.created_at);
    if (isValid(createdAt)) {
      const createdAtPlus30Days = addDays(createdAt, 30);
      return !isAfter(createdAtPlus30Days, today);
    }
  }

  return true;
};

export function delay(time: number) {
  return new Promise(resolve => setTimeout(resolve, time));
}

export function isEmail(str: string) {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(str.trim());
}

export function convertToShoppingListFields(location: Record<string, any>, customer: Record<string, any>, data: Record<string, any>) {
  if (!location || !customer) return null;

  const fields: IShoppingListFields = {
    fields: [
      {
        key: 'location_id',
        value: location?.id?.toString() || '',
        json_value: location?.id?.toString() || '',
      },
      {
        key: 'company_id',
        value: customer?.companyId?.toString() || '',
        json_value: customer?.companyId?.toString() || '',
      },
      {
        key: 'customer_id',
        value: data.createdBy?.id?.toString() || customer?.customerId?.toString(),
        json_value: data.createdBy?.id?.toString() || customer?.customerId?.toString(),
      },
      {
        key: 'status',
        value: data.status || 'active',
        json_value: data.status || 'active',
      },
      {
        key: 'name',
        value: data.title || '',
        json_value: data.title || '',
      },
      {
        key: 'data',
        value: JSON.stringify(data),
        json_value: JSON.parse(JSON.stringify(data)) || {},
      }
    ],
  };

  return fields;
}

