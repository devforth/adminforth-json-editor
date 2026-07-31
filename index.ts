import { AdminForthPlugin, AdminForthDataTypes } from "adminforth";
import type { IAdminForth, AdminForthResource } from "adminforth";
import type { PluginOptions } from './types.js';

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
      if (!Array.isArray(this.options.fixedKeys) || this.options.fixedKeys.some(key => typeof key !== 'string')) {
        throw new Error('[JsonEditorPlugin] "fixedKeys" must be an array of strings');
      }
      if (new Set(this.options.fixedKeys).size !== this.options.fixedKeys.length) {
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

    const editorComponent = {
      file: this.componentPath('JsonEditor.vue'),
      meta: {
        pluginInstanceId: this.pluginInstanceId,
        columnName: this.options.fieldName,
        fixedKeys: this.options.fixedKeys,
      },
    };

    const viewerComponent = {
      file: this.componentPath('JsonViewer.vue'),
      meta: {
        pluginInstanceId: this.pluginInstanceId,
        columnName: this.options.fieldName,
        fixedKeys: this.options.fixedKeys,
      },
    };

    column.components.edit = editorComponent;
    column.components.create = editorComponent;
    column.components.show = viewerComponent;
    column.components.list = viewerComponent;

    if (this.options.fixedKeys !== undefined) {
      const fixedKeys = [...this.options.fixedKeys];
      const validateFixedKeys = (value: unknown) => {
        let parsedValue = value;
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
        const fixedKeySet = new Set(fixedKeys);
        if (savedKeys.length !== fixedKeys.length || savedKeys.some(key => !fixedKeySet.has(key))) {
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
      resourceConfig.hooks.edit.beforeSave.push(async ({ updates, oldRecord }) => {
        const value = Object.prototype.hasOwnProperty.call(updates, this.options.fieldName)
          ? updates[this.options.fieldName]
          : oldRecord[this.options.fieldName];
        const error = validateFixedKeys(value);
        return error ? { ok: false, error } : { ok: true };
      });
    }
  }

  private fixedKeysValidationError(fixedKeys: string[]): string {
    const expectedKeys = fixedKeys.length ? fixedKeys.map(key => `"${key}"`).join(', ') : '(none)';
    return `[JsonEditorPlugin] Field "${this.options.fieldName}" must be a JSON object with exactly these keys: ${expectedKeys}`;
  }
}
