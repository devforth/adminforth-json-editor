import { AdminForthPlugin, AdminForthDataTypes } from "adminforth";
import type { IAdminForth, AdminForthResource } from "adminforth";
import type { PluginOptions, FixedKey } from './types.js';

export default class JsonEditorPlugin extends AdminForthPlugin {
  options: PluginOptions;
  resourceConfig!: AdminForthResource;

  constructor(options: PluginOptions) {
    super(options, import.meta.url);
    this.options = options;
  }

  instanceUniqueRepresentation(pluginOptions: any): string {
    return pluginOptions.fieldName;
  }

  validateConfigAfterDiscover(adminforth: IAdminForth, resourceConfig: AdminForthResource) {
    const column = resourceConfig.columns.find(c => c.name === this.options.fieldName);
    if (!column) {
      throw new Error(`[JsonEditorPlugin] Column "${this.options.fieldName}" not found in resource "${resourceConfig.label}"`);
    }
    const validTypes = [AdminForthDataTypes.JSON, AdminForthDataTypes.STRING, AdminForthDataTypes.TEXT];
    if (!validTypes.includes(column.type!)) {
      throw new Error(
        `[JsonEditorPlugin] Column "${this.options.fieldName}" must be of type json, string, or text, but got "${column.type}"`
      );
    }

    if (this.options.fixedKeys !== undefined) {
      if (
        !Array.isArray(this.options.fixedKeys)
        || this.options.fixedKeys.some(key => typeof key !== 'string' && typeof key?.name !== 'string')
      ) {
        throw new Error('[JsonEditorPlugin] "fixedKeys" must be an array of key names or { name, optional } objects');
      }
      const names = this.normalizeFixedKeys(this.options.fixedKeys).map(key => key.name);
      if (new Set(names).size !== names.length) {
        throw new Error('[JsonEditorPlugin] "fixedKeys" must not contain duplicate keys');
      }
    }
  }

  async modifyResourceConfig(adminforth: IAdminForth, resourceConfig: AdminForthResource) {
    super.modifyResourceConfig(adminforth, resourceConfig);
    this.resourceConfig = resourceConfig;

    const column = resourceConfig.columns.find(c => c.name === this.options.fieldName);
    if (!column) {
      throw new Error(`[JsonEditorPlugin] Column "${this.options.fieldName}" not found in resource "${resourceConfig.label}"`);
    }
    if (!column.components) {
      column.components = {};
    }

    const fixedKeys = this.options.fixedKeys && this.normalizeFixedKeys(this.options.fixedKeys);

    const editorComponent = {
      file: this.componentPath('JsonEditor.vue'),
      meta: {
        pluginInstanceId: this.pluginInstanceId,
        columnName: this.options.fieldName,
        fixedKeys,
      },
    };

    const viewerComponent = {
      file: this.componentPath('JsonViewer.vue'),
      meta: {
        pluginInstanceId: this.pluginInstanceId,
        columnName: this.options.fieldName,
        fixedKeys,
      },
    };

    column.components.edit = editorComponent;
    column.components.create = editorComponent;
    column.components.show = viewerComponent;
    column.components.list = viewerComponent;

    if (fixedKeys) {
      const allowedKeys = new Set(fixedKeys.map(key => key.name));
      const requiredKeys = fixedKeys.filter(key => !key.optional).map(key => key.name);
      const validateFixedKeys = (value: unknown) => {
        let parsedValue = value ?? {};
        if (typeof parsedValue === 'string') {
          try {
            parsedValue = JSON.parse(parsedValue);
          } catch {
            return this.fixedKeysValidationError(fixedKeys);
          }
        }

        if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
          return this.fixedKeysValidationError(fixedKeys);
        }

        const savedKeys = Object.keys(parsedValue);
        if (savedKeys.some(key => !allowedKeys.has(key)) || requiredKeys.some(key => !savedKeys.includes(key))) {
          return this.fixedKeysValidationError(fixedKeys);
        }

        return null;
      };

      resourceConfig.hooks ??= {};
      resourceConfig.hooks.create ??= {};
      resourceConfig.hooks.create.beforeSave ??= [];
      resourceConfig.hooks.create.beforeSave.push(async ({ record }) => {
        const error = validateFixedKeys(record[this.options.fieldName]);
        return error ? { ok: false, error } : { ok: true };
      });

      resourceConfig.hooks.edit ??= {};
      resourceConfig.hooks.edit.beforeSave ??= [];
      resourceConfig.hooks.edit.beforeSave.push(async ({ updates }) => {
        if (!Object.prototype.hasOwnProperty.call(updates, this.options.fieldName)) {
          return { ok: true };
        }
        const error = validateFixedKeys(updates[this.options.fieldName]);
        return error ? { ok: false, error } : { ok: true };
      });
    }
  }

  private normalizeFixedKeys(fixedKeys: (string | FixedKey)[]): FixedKey[] {
    return fixedKeys.map(key => typeof key === 'string' ? { name: key } : key);
  }

  private fixedKeysValidationError(fixedKeys: FixedKey[]): string {
    const expectedKeys = fixedKeys.length
      ? fixedKeys.map(key => `"${key.name}"${key.optional ? ' (optional)' : ''}`).join(', ')
      : '(none)';
    return `[JsonEditorPlugin] Field "${this.options.fieldName}" must be a JSON object with only these keys: ${expectedKeys}`;
  }
}
