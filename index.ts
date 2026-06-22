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
      },
    };

    const viewerComponent = {
      file: this.componentPath('JsonViewer.vue'),
      meta: {
        pluginInstanceId: this.pluginInstanceId,
        columnName: this.options.fieldName,
      },
    };

    column.components.edit = editorComponent;
    column.components.create = editorComponent;
    column.components.show = viewerComponent;
    column.components.list = viewerComponent;
  }
}
