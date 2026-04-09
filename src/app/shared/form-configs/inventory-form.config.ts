import { DynamicFormConfig } from '../dynamic-form/dynamic-form.types';

export const inventoryFormConfig: DynamicFormConfig = {
  formId: 'dailyInventory',
  title: 'Daily Farmer Inventory',
  fields: [
    {
      key: 'date',
      type: 'date',
      label: 'Date',
      validators: [
        { name: 'required', message: 'Date is required.' }
      ]
    },
    {
      key: 'entries',
      type: 'array',
      label: 'Farmer Product Entries',
      minItems: 0,
      addButtonText: 'Add entry',
      removeButtonText: 'Remove',
      itemLabel: 'Entry',
      fields: [
        {
          key: 'farmerId',
          type: 'select',
          label: 'Farmer',
          placeholder: 'Select a farmer',
          options: {
            source: 'assets/data/farmers.json',
            valueKey: 'id',
            labelKey: 'name'
          },
          validators: [
            { name: 'required', message: 'Farmer is required.' }
          ]
        },
        {
          key: 'productId',
          type: 'select',
          label: 'Product',
          placeholder: 'Select a product',
          options: {
            source: 'assets/data/products.json',
            valueKey: 'id',
            labelKey: 'name'
          },
          validators: [
            { name: 'required', message: 'Product is required.' }
          ]
        },
        {
          key: 'quantityKg',
          type: 'number',
          label: 'Quantity (kg)',
          placeholder: 'e.g. 25',
          validators: [
            { name: 'required', message: 'Quantity is required.' },
            { name: 'min', value: 1, message: 'Quantity must be at least 1 kg.' },
            { name: 'max', value: 1000, message: 'Quantity cannot exceed 1000 kg.' }
          ]
        },
        {
          key: 'pricePerKg',
          type: 'number',
          label: 'Price / kg (₹)',
          placeholder: 'e.g. 30',
          validators: [
            { name: 'required', message: 'Price per kg is required.' },
            { name: 'min', value: 1, message: 'Price must be at least ₹1.' },
            { name: 'max', value: 10000, message: 'Price cannot exceed ₹10,000 per kg.' }
          ]
        }
      ]
    }
  ]
};