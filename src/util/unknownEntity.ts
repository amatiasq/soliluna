import { RecipeUnit } from '../model/RecipeUnit';
import { printUnit, Unit } from '../model/Unit';

export function unkonwnEntity(
  kind: string,
  item: { name: string; amount: number; unit: Unit | RecipeUnit }
) {
  const unit = printUnit(item.amount, item.unit);
  const msg = `Borrando ${kind}: ${item.name} (${unit}`;

  alert(msg);
  console.log(msg);
}
