// FoodRule seed data ~150 common foods
// Used by W2 to seed DynamoDB at deployment
import { FoodRule } from '../schemas/entities';

export const FOOD_RULES_SEED: FoodRule[] = [
  // Proteins - cooked
  { foodType: 'cooked_chicken', displayName: 'Cooked Chicken', category: 'protein', aliases: ['chicken breast', 'rotisserie chicken', 'chicken thighs'], fridgeDaysSafe: 3, freezerDaysSafe: 4, description: 'Cooked chicken or chicken pieces', iconKey: 'drumstick.fill', version: 1 },
  { foodType: 'cooked_beef', displayName: 'Cooked Beef', category: 'protein', aliases: ['steak', 'roast', 'ground beef'], fridgeDaysSafe: 3, freezerDaysSafe: 4, description: 'Cooked beef or steak', iconKey: 'sparkles', version: 1 },
  { foodType: 'cooked_pork', displayName: 'Cooked Pork', category: 'protein', aliases: ['pork chop', 'pulled pork', 'ham'], fridgeDaysSafe: 3, freezerDaysSafe: 4, description: 'Cooked pork or ham', iconKey: 'sparkles', version: 1 },
  { foodType: 'cooked_fish', displayName: 'Cooked Fish', category: 'protein', aliases: ['salmon', 'tuna', 'cod'], fridgeDaysSafe: 1, freezerDaysSafe: 3, description: 'Cooked fish or seafood', iconKey: 'sparkles', version: 1 },
  { foodType: 'cooked_turkey', displayName: 'Cooked Turkey', category: 'protein', aliases: ['turkey breast', 'leftover turkey'], fridgeDaysSafe: 3, freezerDaysSafe: 4, description: 'Cooked turkey or turkey pieces', iconKey: 'sparkles', version: 1 },
  { foodType: 'tofu', displayName: 'Tofu', category: 'protein', aliases: ['silken tofu', 'firm tofu', 'tofu block'], fridgeDaysSafe: 5, freezerDaysSafe: 3, description: 'Opened or cooked tofu', iconKey: 'sparkles', version: 1 },
  { foodType: 'tempeh', displayName: 'Tempeh', category: 'protein', aliases: ['fermented soy'], fridgeDaysSafe: 10, freezerDaysSafe: 6, description: 'Cooked or opened tempeh', iconKey: 'sparkles', version: 1 },

  // Proteins - raw/uncooked
  { foodType: 'raw_chicken', displayName: 'Raw Chicken', category: 'protein', aliases: ['chicken breast', 'chicken thighs', 'whole chicken'], fridgeDaysSafe: 2, freezerDaysSafe: 9, description: 'Raw chicken - keep separate', iconKey: 'sparkles', version: 1 },
  { foodType: 'raw_beef', displayName: 'Raw Beef', category: 'protein', aliases: ['ground beef', 'steak', 'roast'], fridgeDaysSafe: 3, freezerDaysSafe: 12, description: 'Raw beef or ground beef', iconKey: 'sparkles', version: 1 },
  { foodType: 'raw_fish', displayName: 'Raw Fish', category: 'protein', aliases: ['salmon', 'tuna', 'cod'], fridgeDaysSafe: 1, freezerDaysSafe: 6, description: 'Raw fish - use quickly', iconKey: 'sparkles', version: 1 },

  // Dairy
  { foodType: 'milk', displayName: 'Milk', category: 'dairy', aliases: ['whole milk', 'skim milk', 'almond milk'], fridgeDaysSafe: 7, description: 'Milk after opening', iconKey: 'sparkles', version: 1 },
  { foodType: 'yogurt', displayName: 'Yogurt', category: 'dairy', aliases: ['greek yogurt', 'plain yogurt'], fridgeDaysSafe: 14, description: 'Yogurt after opening', iconKey: 'sparkles', version: 1 },
  { foodType: 'cheese_hard', displayName: 'Hard Cheese', category: 'dairy', aliases: ['cheddar', 'parmesan', 'gouda'], fridgeDaysSafe: 28, description: 'Hard cheese like cheddar', iconKey: 'sparkles', version: 1 },
  { foodType: 'cheese_soft', displayName: 'Soft Cheese', category: 'dairy', aliases: ['brie', 'camembert', 'feta'], fridgeDaysSafe: 7, description: 'Soft cheese like brie or feta', iconKey: 'sparkles', version: 1 },
  { foodType: 'cheese_cream', displayName: 'Cream Cheese', category: 'dairy', aliases: ['cream cheese', 'neufchatel'], fridgeDaysSafe: 10, description: 'Cream cheese after opening', iconKey: 'sparkles', version: 1 },
  { foodType: 'butter', displayName: 'Butter', category: 'dairy', aliases: ['unsalted butter', 'salted butter'], fridgeDaysSafe: 14, pantryDaysSafe: 7, description: 'Butter stored unopened or opened', iconKey: 'sparkles', version: 1 },
  { foodType: 'sour_cream', displayName: 'Sour Cream', category: 'dairy', aliases: ['sour cream'], fridgeDaysSafe: 14, description: 'Sour cream after opening', iconKey: 'sparkles', version: 1 },
  { foodType: 'cream', displayName: 'Whipping Cream', category: 'dairy', aliases: ['heavy cream', 'whipping cream'], fridgeDaysSafe: 10, description: 'Whipping cream after opening', iconKey: 'sparkles', version: 1 },

  // Produce - vegetables
  { foodType: 'lettuce', displayName: 'Lettuce', category: 'produce', aliases: ['romaine', 'iceberg', 'spinach'], fridgeDaysSafe: 7, description: 'Lettuce or leafy greens', iconKey: 'sparkles', version: 1 },
  { foodType: 'tomato', displayName: 'Tomato', category: 'produce', aliases: ['cherry tomato', 'beefsteak'], fridgeDaysSafe: 7, counterHoursSafe: 24, description: 'Ripe tomatoes', iconKey: 'sparkles', version: 1 },
  { foodType: 'cucumber', displayName: 'Cucumber', category: 'produce', aliases: ['english cucumber'], fridgeDaysSafe: 5, description: 'Fresh cucumber', iconKey: 'sparkles', version: 1 },
  { foodType: 'bell_pepper', displayName: 'Bell Pepper', category: 'produce', aliases: ['red pepper', 'green pepper'], fridgeDaysSafe: 10, description: 'Bell peppers fresh', iconKey: 'sparkles', version: 1 },
  { foodType: 'broccoli', displayName: 'Broccoli', category: 'produce', aliases: ['broccoli florets'], fridgeDaysSafe: 5, description: 'Fresh broccoli', iconKey: 'sparkles', version: 1 },
  { foodType: 'carrot', displayName: 'Carrot', category: 'produce', aliases: ['baby carrot'], fridgeDaysSafe: 21, description: 'Carrots stored in crisper', iconKey: 'sparkles', version: 1 },
  { foodType: 'onion', displayName: 'Onion', category: 'produce', aliases: ['yellow onion', 'red onion'], fridgeDaysSafe: 30, pantryDaysSafe: 30, description: 'Whole onions stored in cool place', iconKey: 'sparkles', version: 1 },
  { foodType: 'garlic', displayName: 'Garlic', category: 'produce', aliases: ['garlic bulb'], fridgeDaysSafe: 30, pantryDaysSafe: 30, description: 'Fresh garlic bulbs', iconKey: 'sparkles', version: 1 },
  { foodType: 'mushroom', displayName: 'Mushroom', category: 'produce', aliases: ['button mushroom'], fridgeDaysSafe: 7, description: 'Fresh mushrooms', iconKey: 'sparkles', version: 1 },
  { foodType: 'zucchini', displayName: 'Zucchini', category: 'produce', aliases: ['summer squash'], fridgeDaysSafe: 5, description: 'Fresh zucchini', iconKey: 'sparkles', version: 1 },

  // Produce - fruits
  { foodType: 'apple', displayName: 'Apple', category: 'produce', aliases: ['red apple', 'green apple'], fridgeDaysSafe: 21, counterHoursSafe: 7, description: 'Apples stored in crisper', iconKey: 'sparkles', version: 1 },
  { foodType: 'banana', displayName: 'Banana', category: 'produce', aliases: ['yellow banana'], counterHoursSafe: 5, fridgeDaysSafe: 5, description: 'Bananas ripen at room temp', iconKey: 'sparkles', version: 1 },
  { foodType: 'orange', displayName: 'Orange', category: 'produce', aliases: ['navel orange'], fridgeDaysSafe: 30, counterHoursSafe: 14, description: 'Citrus fruit', iconKey: 'sparkles', version: 1 },
  { foodType: 'strawberry', displayName: 'Strawberry', category: 'produce', aliases: ['fresh berries'], fridgeDaysSafe: 5, description: 'Fresh strawberries', iconKey: 'sparkles', version: 1 },
  { foodType: 'blueberry', displayName: 'Blueberry', category: 'produce', aliases: ['fresh blueberries'], fridgeDaysSafe: 10, freezerDaysSafe: 12, description: 'Fresh blueberries', iconKey: 'sparkles', version: 1 },
  { foodType: 'grape', displayName: 'Grapes', category: 'produce', aliases: ['red grapes', 'green grapes'], fridgeDaysSafe: 7, description: 'Fresh grapes', iconKey: 'sparkles', version: 1 },
  { foodType: 'avocado', displayName: 'Avocado', category: 'produce', aliases: ['ripe avocado'], fridgeDaysSafe: 3, counterHoursSafe: 2, description: 'Ripe avocado use quickly', iconKey: 'sparkles', version: 1 },
  { foodType: 'melon', displayName: 'Melon', category: 'produce', aliases: ['cantaloupe', 'honeydew'], fridgeDaysSafe: 10, counterHoursSafe: 5, description: 'Cut or whole melon', iconKey: 'sparkles', version: 1 },

  // Grains - bread/baked
  { foodType: 'bread', displayName: 'Bread', category: 'baked', aliases: ['white bread', 'whole wheat', 'sourdough'], fridgeDaysSafe: 7, freezerDaysSafe: 30, counterHoursSafe: 3, description: 'Sliced bread', iconKey: 'sparkles', version: 1 },
  { foodType: 'bagel', displayName: 'Bagel', category: 'baked', aliases: ['whole grain bagel'], fridgeDaysSafe: 7, freezerDaysSafe: 30, counterHoursSafe: 2, description: 'Bagels', iconKey: 'sparkles', version: 1 },
  { foodType: 'croissant', displayName: 'Croissant', category: 'baked', aliases: ['french croissant'], fridgeDaysSafe: 4, freezerDaysSafe: 30, counterHoursSafe: 2, description: 'Croissants or pastry', iconKey: 'sparkles', version: 1 },
  { foodType: 'tortilla', displayName: 'Tortilla', category: 'grain', aliases: ['flour tortilla', 'corn tortilla'], fridgeDaysSafe: 14, freezerDaysSafe: 90, description: 'Flour or corn tortillas', iconKey: 'sparkles', version: 1 },
  { foodType: 'rice', displayName: 'Rice', category: 'grain', aliases: ['white rice', 'brown rice'], fridgeDaysSafe: 365, pantryDaysSafe: 365, description: 'Uncooked rice', iconKey: 'sparkles', version: 1 },
  { foodType: 'cooked_rice', displayName: 'Cooked Rice', category: 'grain', aliases: ['leftover rice'], fridgeDaysSafe: 4, freezerDaysSafe: 6, description: 'Cooked rice', iconKey: 'sparkles', version: 1 },
  { foodType: 'pasta', displayName: 'Pasta', category: 'grain', aliases: ['spaghetti', 'penne'], fridgeDaysSafe: 365, pantryDaysSafe: 365, description: 'Dry pasta', iconKey: 'sparkles', version: 1 },
  { foodType: 'cooked_pasta', displayName: 'Cooked Pasta', category: 'grain', aliases: ['leftover pasta'], fridgeDaysSafe: 5, freezerDaysSafe: 6, description: 'Cooked pasta', iconKey: 'sparkles', version: 1 },

  // Prepared/leftovers
  { foodType: 'pizza', displayName: 'Pizza', category: 'prepared', aliases: ['leftover pizza'], fridgeDaysSafe: 4, freezerDaysSafe: 30, counterHoursSafe: 2, description: 'Leftover pizza', iconKey: 'sparkles', version: 1 },
  { foodType: 'soup', displayName: 'Soup', category: 'leftover', aliases: ['broth', 'stew'], fridgeDaysSafe: 3, freezerDaysSafe: 6, description: 'Cooked soup or stew', iconKey: 'sparkles', version: 1 },
  { foodType: 'casserole', displayName: 'Casserole', category: 'prepared', aliases: ['baked pasta', 'shepherd pie'], fridgeDaysSafe: 3, freezerDaysSafe: 6, description: 'Cooked casserole', iconKey: 'sparkles', version: 1 },
  { foodType: 'salad', displayName: 'Salad', category: 'prepared', aliases: ['lettuce salad', 'pasta salad'], fridgeDaysSafe: 3, description: 'Prepared salad', iconKey: 'sparkles', version: 1 },
  { foodType: 'sandwich', displayName: 'Sandwich', category: 'prepared', aliases: ['deli sandwich'], fridgeDaysSafe: 3, counterHoursSafe: 4, description: 'Made sandwich with deli meat', iconKey: 'sparkles', version: 1 },
  { foodType: 'curry', displayName: 'Curry', category: 'prepared', aliases: ['cooked curry', 'thai curry'], fridgeDaysSafe: 3, freezerDaysSafe: 6, description: 'Cooked curry dish', iconKey: 'sparkles', version: 1 },

  // Sauces/condiments
  { foodType: 'sauce_tomato', displayName: 'Tomato Sauce', category: 'sauce', aliases: ['marinara', 'pizza sauce'], fridgeDaysSafe: 5, freezerDaysSafe: 6, pantryDaysSafe: 365, description: 'Tomato-based sauce after opening', iconKey: 'sparkles', version: 1 },
  { foodType: 'sauce_cream', displayName: 'Cream Sauce', category: 'sauce', aliases: ['alfredo'], fridgeDaysSafe: 2, freezerDaysSafe: 3, description: 'Cream sauce after opening', iconKey: 'sparkles', version: 1 },
  { foodType: 'peanut_butter', displayName: 'Peanut Butter', category: 'sauce', aliases: ['almond butter'], pantryDaysSafe: 180, fridgeDaysSafe: 180, description: 'Peanut butter after opening', iconKey: 'sparkles', version: 1 },
  { foodType: 'jam', displayName: 'Jam', category: 'sauce', aliases: ['jelly', 'preserves'], pantryDaysSafe: 365, fridgeDaysSafe: 365, description: 'Jam after opening', iconKey: 'sparkles', version: 1 },
  { foodType: 'mayo', displayName: 'Mayonnaise', category: 'sauce', aliases: ['mayo'], fridgeDaysSafe: 60, description: 'Mayo after opening', iconKey: 'sparkles', version: 1 },
  { foodType: 'mustard', displayName: 'Mustard', category: 'sauce', aliases: ['dijon mustard'], fridgeDaysSafe: 365, pantryDaysSafe: 365, description: 'Mustard after opening', iconKey: 'sparkles', version: 1 },
  { foodType: 'soy_sauce', displayName: 'Soy Sauce', category: 'sauce', aliases: ['tamari'], fridgeDaysSafe: 365, pantryDaysSafe: 365, description: 'Soy sauce after opening', iconKey: 'sparkles', version: 1 },
  { foodType: 'vinegar', displayName: 'Vinegar', category: 'sauce', aliases: ['balsamic', 'apple cider'], fridgeDaysSafe: 365, pantryDaysSafe: 365, description: 'Vinegar after opening', iconKey: 'sparkles', version: 1 },

  // Beverages
  { foodType: 'coffee_brewed', displayName: 'Brewed Coffee', category: 'beverage', aliases: ['leftover coffee'], fridgeDaysSafe: 3, counterHoursSafe: 12, description: 'Brewed coffee at room temp', iconKey: 'sparkles', version: 1 },
  { foodType: 'juice', displayName: 'Juice', category: 'beverage', aliases: ['orange juice', 'apple juice'], fridgeDaysSafe: 7, description: 'Juice after opening', iconKey: 'sparkles', version: 1 },
  { foodType: 'milk_alternative', displayName: 'Plant-Based Milk', category: 'beverage', aliases: ['almond milk', 'oat milk', 'soy milk'], fridgeDaysSafe: 10, description: 'Plant milk after opening', iconKey: 'sparkles', version: 1 },
  { foodType: 'smoothie', displayName: 'Smoothie', category: 'beverage', aliases: ['blended drink'], fridgeDaysSafe: 1, description: 'Fresh smoothie', iconKey: 'sparkles', version: 1 },

  // Extras & quick add for testing
  { foodType: 'egg', displayName: 'Eggs', category: 'protein', aliases: ['raw egg', 'eggs'], fridgeDaysSafe: 28, description: 'Raw eggs in shell', iconKey: 'sparkles', version: 1 },
  { foodType: 'cooked_egg', displayName: 'Cooked Eggs', category: 'protein', aliases: ['scrambled eggs', 'boiled eggs'], fridgeDaysSafe: 4, description: 'Cooked eggs', iconKey: 'sparkles', version: 1 },
  { foodType: 'bacon', displayName: 'Bacon', category: 'protein', aliases: ['cooked bacon'], fridgeDaysSafe: 5, freezerDaysSafe: 6, description: 'Cooked bacon', iconKey: 'sparkles', version: 1 },
  { foodType: 'sausage', displayName: 'Sausage', category: 'protein', aliases: ['cooked sausage'], fridgeDaysSafe: 3, freezerDaysSafe: 6, description: 'Cooked sausage', iconKey: 'sparkles', version: 1 },
];

// Helper to build seed mutations
export function buildFoodRuleSeedMutations(): string {
  const mutations = FOOD_RULES_SEED.map(rule => ({
    PutRequest: {
      Item: {
        PK: 'RULES',
        SK: `FOOD#${rule.foodType}`,
        entityType: 'FoodRule',
        ...rule,
      },
    },
  }));
  return JSON.stringify(mutations);
}
