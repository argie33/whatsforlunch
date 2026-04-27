import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FOOD_TYPES = [
  { type: 'leftover_pasta', days: 3, cat: 'leftovers' },
  { type: 'leftover_rice', days: 4, cat: 'leftovers' },
  { type: 'leftover_chicken', days: 2, cat: 'leftovers' },
  { type: 'leftover_beef', days: 3, cat: 'leftovers' },
  { type: 'leftover_fish', days: 2, cat: 'leftovers' },
  { type: 'apple', days: 7, cat: 'produce' },
  { type: 'banana', days: 3, cat: 'produce' },
  { type: 'strawberry', days: 5, cat: 'produce' },
  { type: 'spinach', days: 3, cat: 'produce' },
  { type: 'broccoli', days: 5, cat: 'produce' },
  { type: 'milk', days: 7, cat: 'dairy' },
  { type: 'yogurt', days: 14, cat: 'dairy' },
  { type: 'cheese', days: 21, cat: 'dairy' },
  { type: 'butter', days: 30, cat: 'dairy' },
  { type: 'chicken_breast', days: 2, cat: 'protein' },
  { type: 'beef_steak', days: 3, cat: 'protein' },
  { type: 'fish_salmon', days: 2, cat: 'protein' },
  { type: 'ground_beef', days: 2, cat: 'protein' },
  { type: 'bread', days: 7, cat: 'prepared' },
  { type: 'cereal', days: 365, cat: 'prepared' },
  { type: 'pasta_dry', days: 365, cat: 'prepared' },
  { type: 'rice_dry', days: 365, cat: 'prepared' },
];

const STORAGE_LOCATIONS = ['fridge', 'freezer', 'pantry', 'counter', 'lunchbox'];
const DATE_FORMATS = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'Month Day Year'];
const DATE_KEYWORDS = ['USE BY', 'SELL BY', 'BEST BY', 'EXPIRES', 'BEST BEFORE', 'CONSUME BY'];

function generateClassifyFoodExamples(count) {
  const examples = [];
  for (let i = 0; i < count; i++) {
    const food = FOOD_TYPES[i % FOOD_TYPES.length];
    const location = STORAGE_LOCATIONS[i % STORAGE_LOCATIONS.length];

    let daysSafe = food.days;
    if (location === 'freezer') {
      daysSafe = Math.min(30, food.days * 10);
    } else if (location === 'pantry' && food.cat !== 'prepared') {
      daysSafe = Math.max(1, Math.floor(food.days / 2));
    } else if (location === 'counter') {
      daysSafe = Math.max(1, Math.floor(food.days / 2));
    }

    examples.push({
      photoPath: `photos/${food.type}_${String(i).padStart(3, '0')}.jpg`,
      foodType: food.type,
      daysSafe,
      storageLocation: location,
      category: food.cat,
    });
  }
  return examples;
}

function generateOcrDateExamples(count) {
  const examples = [];
  const today = new Date();

  for (let i = 0; i < count; i++) {
    const daysFromNow = (i % 365) + 1;
    const expiryDate = new Date(today);
    expiryDate.setDate(expiryDate.getDate() + daysFromNow);

    const year = expiryDate.getFullYear();
    const month = String(expiryDate.getMonth() + 1).padStart(2, '0');
    const day = String(expiryDate.getDate()).padStart(2, '0');

    const format = DATE_FORMATS[i % DATE_FORMATS.length];

    let expectedDate;
    if (format === 'MM/DD/YYYY') {
      expectedDate = `${month}/${day}/${year}`;
    } else if (format === 'DD/MM/YYYY') {
      expectedDate = `${day}/${month}/${year}`;
    } else if (format === 'YYYY-MM-DD') {
      expectedDate = `${year}-${month}-${day}`;
    } else {
      const monthName = expiryDate.toLocaleDateString('en-US', { month: 'long' });
      expectedDate = `${monthName} ${day}, ${year}`;
    }

    const confidence = i % 2 === 0 ? 0.9 + Math.random() * 0.06 : 0.7 + Math.random() * 0.2;

    examples.push({
      photoPath: `photos/package_date_${String(i).padStart(3, '0')}.jpg`,
      expectedDate: expectedDate.substring(0, 10),
      dateFormat: format,
      confidence: Math.min(0.99, confidence),
    });
  }
  return examples;
}

function saveClassifyFoodExamples(examples, filename) {
  const header = 'photoPath,foodType,daysSafe,storageLocation,category\n';
  const rows = examples.map(e => `${e.photoPath},${e.foodType},${e.daysSafe},${e.storageLocation},${e.category}\n`);
  fs.writeFileSync(filename, header + rows.join(''));
  console.log(`✅ Saved ${examples.length} classify-food examples to ${filename}`);
}

function saveOcrDateExamples(examples, filename) {
  const header = 'photoPath,expectedDate,dateFormat,confidence\n';
  const rows = examples.map(e => `${e.photoPath},${e.expectedDate},${e.dateFormat},${e.confidence.toFixed(2)}\n`);
  fs.writeFileSync(filename, header + rows.join(''));
  console.log(`✅ Saved ${examples.length} ocr-date examples to ${filename}`);
}

function generateAllTestData(classifyCount = 100, ocrCount = 50) {
  console.log('🔄 Generating test data...\n');

  const classifyExamples = generateClassifyFoodExamples(classifyCount);
  const ocrExamples = generateOcrDateExamples(ocrCount);

  const classifyPath = path.join(__dirname, 'classify-food', 'ground-truth.csv');
  const ocrPath = path.join(__dirname, 'ocr-expiry-date', 'ground-truth.csv');

  saveClassifyFoodExamples(classifyExamples, classifyPath);
  saveOcrDateExamples(ocrExamples, ocrPath);

  console.log(`
📊 Test Data Generation Complete

Summary:
- classify-food: ${classifyCount} examples
  - Food types: ${new Set(classifyExamples.map(e => e.foodType)).size} unique
  - Storage locations: ${new Set(classifyExamples.map(e => e.storageLocation)).size} types

- ocr-expiry-date: ${ocrCount} examples
  - Date formats: ${new Set(ocrExamples.map(e => e.dateFormat)).size} types
  - Confidence range: 0.70-0.99
  `);
}

const classifyCount = parseInt(process.argv[2] || '150');
const ocrCount = parseInt(process.argv[3] || '100');
generateAllTestData(classifyCount, ocrCount);
