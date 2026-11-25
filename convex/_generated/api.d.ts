/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as admin from "../admin.js";
import type * as devtools from "../devtools.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_events from "../lib/events.js";
import type * as lib_hmac from "../lib/hmac.js";
import type * as lib_loans from "../lib/loans.js";
import type * as lib_validators from "../lib/validators.js";
import type * as loans from "../loans.js";
import type * as notifications from "../notifications.js";
import type * as reminders from "../reminders.js";
import type * as tests_helpers from "../tests/helpers.js";
import type * as tools from "../tools.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  devtools: typeof devtools;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/dates": typeof lib_dates;
  "lib/events": typeof lib_events;
  "lib/hmac": typeof lib_hmac;
  "lib/loans": typeof lib_loans;
  "lib/validators": typeof lib_validators;
  loans: typeof loans;
  notifications: typeof notifications;
  reminders: typeof reminders;
  "tests/helpers": typeof tests_helpers;
  tools: typeof tools;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
