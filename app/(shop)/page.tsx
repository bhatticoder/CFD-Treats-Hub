import { PageContainer } from "@/components/app-shell";
import { MenuBrowser } from "@/components/menu-browser";
import type { Item } from "@/lib/types/models";

export const dynamic = "force-static";

const demoItems: Item[] = [
  {
    id: "demo-zinger",
    campus_id: "boys-hostel",
    name: "Zinger Burger",
    description: "Crispy chicken, lettuce, cheese and house sauce.",
    price: 420,
    discounted_price: 380,
    delivery_fee: 0,
    image_url: null,
    category: "Burgers",
    stock_quantity: 18,
    is_available: true,
    custom_instruction: null,
    tag: "POPULAR",
    restaurant_id: "canteen",
    expected_arrival: null,
    is_preorder: false,
    created_at: new Date().toISOString(),
    restaurants: { name: "Boys Hostel Canteen" },
  },
  {
    id: "demo-fries",
    campus_id: "boys-hostel",
    name: "Loaded Fries",
    description: "Seasoned fries topped with cheese sauce and jalapeños.",
    price: 250,
    discounted_price: null,
    delivery_fee: 0,
    image_url: null,
    category: "Snacks",
    stock_quantity: 24,
    is_available: true,
    custom_instruction: "Extra sauce available",
    tag: "FEW LEFT",
    restaurant_id: "canteen",
    expected_arrival: null,
    is_preorder: false,
    created_at: new Date().toISOString(),
    restaurants: { name: "Boys Hostel Canteen" },
  },
  {
    id: "demo-shawarma",
    campus_id: "boys-hostel",
    name: "Chicken Shawarma",
    description: "Marinated chicken, garlic sauce and fresh salad.",
    price: 300,
    discounted_price: 275,
    delivery_fee: 0,
    image_url: null,
    category: "Wraps",
    stock_quantity: 12,
    is_available: true,
    custom_instruction: null,
    tag: null,
    restaurant_id: "grill",
    expected_arrival: null,
    is_preorder: false,
    created_at: new Date().toISOString(),
    restaurants: { name: "Hostel Grill" },
  },
  {
    id: "demo-cola",
    campus_id: "boys-hostel",
    name: "Chilled Cola",
    description: "Cold 500ml soft drink.",
    price: 100,
    discounted_price: null,
    delivery_fee: 0,
    image_url: null,
    category: "Drinks",
    stock_quantity: 40,
    is_available: true,
    custom_instruction: null,
    tag: "COLD",
    restaurant_id: "canteen",
    expected_arrival: null,
    is_preorder: false,
    created_at: new Date().toISOString(),
    restaurants: { name: "Boys Hostel Canteen" },
  },
];

export default function MenuPage() {
  return (
    <PageContainer>
      <MenuBrowser
        items={demoItems}
        categories={["Burgers", "Snacks", "Wraps", "Drinks"]}
        shiftActive={false}
        preordersOpen={false}
        firstName="Ali"
        campusName="Boys Hostel"
        deliveryActive
        collectionRoom="Boys Hostel Reception"
      />
    </PageContainer>
  );
}
