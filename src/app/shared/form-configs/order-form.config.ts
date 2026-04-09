import { DynamicFormConfig } from '../dynamic-form/dynamic-form.types';

export const orderFormConfig: DynamicFormConfig = {
  formId: 'placeNewOrder',
  title: 'Place New Order',
  fields: [
    {
      key: 'kiranaId',
      type: 'select',
      label: 'Kirana shop',
      placeholder: 'Select a shop',
      options: {
        source: 'assets/data/kiranas.json',
        valueKey: 'id',
        labelKey: 'shopName'
      },
      validators: [
        { name: 'required', message: 'Kirana shop is required.' }
      ]
    },
    {
      key: 'deliveryDate',
      type: 'date',
      label: 'Requested delivery date',
      validators: [
        { name: 'required', message: 'Delivery date is required.' }
      ]
    },
    {
      key: 'notes',
      type: 'text',
      label: 'Notes',
      placeholder: 'Optional instructions for ops',
      validators: []
    },
    {
      key: 'lineItems',
      type: 'array',
      label: 'Order items',
      minItems: 1,
      addButtonText: 'Add item',
      removeButtonText: 'Remove item',
      itemLabel: 'Item',
      fields: [
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
          placeholder: 'e.g. 15',
          validators: [
            { name: 'required', message: 'Quantity is required.' },
            { name: 'min', value: 1, message: 'Quantity must be at least 1 kg.' },
            { name: 'max', value: 1000, message: 'Quantity cannot exceed 1000 kg.' }
          ]
        }
      ]
    }
  ]
};
