import { type PluginsCommonOptions } from "adminforth";

export interface PluginOptions extends PluginsCommonOptions {
  /**
   * Name of the field (column) that stores JSON data.
   */
  fieldName: string;

  /**
   * Fixed set of keys available in the editor, in display order.
   * A string is shorthand for `{ name }`, a required key.
   */
  fixedKeys?: (string | FixedKey)[];
}

export interface FixedKey {
  /**
   * Key name in the stored object.
   */
  name: string;

  /**
   * Allow the key to be omitted from the stored object. An empty value in the editor omits the key.
   * When every key is optional, an empty object `{}` is valid.
   */
  optional?: boolean;
}
