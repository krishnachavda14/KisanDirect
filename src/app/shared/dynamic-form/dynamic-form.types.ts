export type ValidatorName = 'required' | 'min' | 'max';

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'array';

export type ValidatorsConfig = {
  name: ValidatorName;
  value?: number;
  message: string;
};

export type SelectOptionsConfig = {
  source: string;
  valueKey: string;
  labelKey: string;
};

export type BaseFieldConfig = {
  key: string;
  type: Exclude<FieldType, 'array'>;
  label: string;
  placeholder?: string;
  validators?: ValidatorsConfig[];
  options?: SelectOptionsConfig;
};

export type ArrayFieldConfig = {
  key: string;
  type: 'array';
  label: string;
  minItems?: number;
  addButtonText?: string;
  removeButtonText?: string;
  itemLabel?: string;
  fields: BaseFieldConfig[];
};

export type FieldConfig = BaseFieldConfig | ArrayFieldConfig;

export type DynamicFormConfig = {
  formId: string;
  title: string;
  fields: FieldConfig[];
};
