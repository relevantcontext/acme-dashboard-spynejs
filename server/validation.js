// Ported verbatim from the Next.js app's app/lib/actions.ts.
//
// Same zod major (3.25.x) and the same schema definitions, so both sides accept
// and reject exactly the same input and produce the same field-error messages.
// Only the transport differs: Next.js returns this object from a server action
// straight into useActionState, while this tier returns it as JSON with a 400.
// That way the SpyneJS form renders identical validation text and only the
// rendering mechanism is under comparison.

import { z } from 'zod';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ date: true, id: true });

/**
 * Returns either { data } or the exact `State` shape actions.ts returns on a
 * failed safeParse: { errors: fieldErrors, message }.
 */
// The Next.js actions read fields with formData.get(), which yields `null` for a
// missing field — never `undefined`. Zod treats those differently: `null` trips
// invalid_type_error (the custom copy above), while `undefined` trips
// required_error and yields a bare "Required".
//
// A JSON body gives `undefined` for an absent key, so without this the SpyneJS
// form would show "Required" / "Expected number, received nan" where the Next.js
// form shows "Please select a customer." Normalising to null reproduces
// FormData semantics exactly and keeps the two sides' messages identical.
const asFormValue = (v) => (v === undefined ? null : v);

function parseWith(schema, body, failureMessage) {
  const validatedFields = schema.safeParse({
    customerId: asFormValue(body.customerId),
    amount: asFormValue(body.amount),
    status: asFormValue(body.status),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: failureMessage,
    };
  }

  return { data: validatedFields.data };
}

export const parseCreateInvoice = (body) =>
  parseWith(CreateInvoice, body, 'Missing Fields. Failed to Create Invoice.');

export const parseUpdateInvoice = (body) =>
  parseWith(UpdateInvoice, body, 'Missing Fields. Failed to Update Invoice.');
