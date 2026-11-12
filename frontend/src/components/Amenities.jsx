import { Wifi, Coffee, Waves, Car, Utensils, Sparkles, Flame, CircleCheck } from 'lucide-react';
const icons = { 'Free WiFi': Wifi, Breakfast: Coffee, Pool: Waves, Parking: Car, Restaurant: Utensils, Spa: Sparkles, Heater: Flame };
export default function Amenities({ items }) {
  return <ul className="amenities" aria-label="Amenities">{items.map(item => {
    const Icon = icons[item] || CircleCheck;
    return <li key={item}><Icon size={16} aria-hidden="true" />{item}</li>;
  })}</ul>;
}
