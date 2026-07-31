import { type PluginsCommonOptions } from "adminforth";

export interface PluginOptions extends PluginsCommonOptions {
  /**
   * Name of the field (column) that stores JSON data.
   */
  fieldName: string;

  /**
   * Fixed set of keys available in the editor, in display order.
   */
  fixedKeys?: string[];
}
