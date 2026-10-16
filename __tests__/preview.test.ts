import { displayBody, previewFromBody } from '../src/utils/preview';
import { generateEmail } from '../src/api/data';

test('displayBody strips the leading Hi, greeting', () => {
  const body = 'Hi,\n\nHappy to walk you through it live if that is easier.\n\nThanks,\nMaya';
  expect(displayBody(body).startsWith('Hi,')).toBe(false);
  expect(displayBody(body).startsWith('Happy to walk')).toBe(true);
});

test('previewFromBody skips Hi, and uses body paragraphs', () => {
  const body = 'Hi,\n\nHappy to walk you through it live if that is easier.\n\nThanks,\nMaya';
  expect(previewFromBody(body)).toBe(
    'Happy to walk you through it live if that is easier.',
  );
});

test('row preview for a generated email appears inside its body', () => {
  const email = generateEmail(2);
  const preview = previewFromBody(email.body);
  expect(preview.length).toBeGreaterThan(0);
  // Every word sequence from the preview should be findable in the flattened body.
  const flatBody = email.body.replace(/\s+/g, ' ');
  const flatPreview = preview.replace(/\s+/g, ' ');
  expect(flatBody.includes(flatPreview.slice(0, Math.min(40, flatPreview.length)))).toBe(
    true,
  );
});
