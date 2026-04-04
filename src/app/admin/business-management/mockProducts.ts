// Centralized mock product data for all businesses
export interface Product {
  id: string;
  name: string;
  active: string; // Active ingredient
  class: string;
  amount: number;
  business: string;
  location: string;
  image: string; // URL or base64
}

export const mockProducts: Product[] = [
  {
    id: "prod1",
    name: "Paracetamol 500mg",
    active: "Paracetamol",
    class: "Analgesic",
    amount: 1200,
    business: "Green Pharmacy",
    location: "12 Health Ave, Lagos",
    image: "https://via.placeholder.com/60x60?text=Paracetamol"
  },
  {
    id: "prod2",
    name: "Amoxicillin 250mg",
    active: "Amoxicillin",
    class: "Antibiotic",
    amount: 2500,
    business: "City Meds",
    location: "88 Main St, Abuja",
    image: "https://via.placeholder.com/60x60?text=Amoxicillin"
  },
  {
    id: "prod3",
    name: "Vitamin C 1000mg",
    active: "Ascorbic Acid",
    class: "Supplement",
    amount: 900,
    business: "Wellness Hub",
    location: "5 Unity Rd, Port Harcourt",
    image: "https://via.placeholder.com/60x60?text=Vitamin+C"
  }
];
