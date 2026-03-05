/* ============================================================
   FitLife PWA - Nutrition Tracker
   ============================================================ */

async function loadNutrition() {
  try {
    const data = await api('GET', '/api/nutrition');
    renderNutrition(data);
  } catch (e) {
    toast('Failed to load nutrition: ' + e.message, 'error');
  }
}

function renderNutrition(data) {
  const { entries, totals } = data;

  // Totals
  setEl('nut-calories', totals.calories);
  setEl('nut-protein', `${totals.protein_g}g`);
  setEl('nut-carbs', `${totals.carbs_g}g`);
  setEl('nut-fats', `${totals.fats_g}g`);
  setEl('nut-water', `${Math.round(totals.water_ml / 250)} / 8`);

  // Calorie progress bar (target 2000 kcal)
  const calPct = Math.min(100, Math.round(totals.calories / 2000 * 100));
  const calBar = document.getElementById('calorie-bar');
  if (calBar) calBar.style.width = `${calPct}%`;

  // Water glasses
  const glassesTotal = Math.round(totals.water_ml / 250);
  const waterContainer = document.getElementById('water-glasses');
  if (waterContainer) {
    waterContainer.innerHTML = Array.from({ length: 8 }, (_, i) => `
      <span class="water-glass ${i < glassesTotal ? 'filled' : ''}" onclick="addWaterGlass(${i + 1})" title="Add glass ${i + 1}">💧</span>
    `).join('');
  }

  // Macro chart
  if (totals.protein_g > 0 || totals.carbs_g > 0 || totals.fats_g > 0) {
    renderMacroChart(totals);
  }

  // Meal entries grouped by type
  const meals = { breakfast: [], lunch: [], dinner: [], snack: [] };
  for (const e of entries) {
    const type = e.meal_type || 'snack';
    if (meals[type]) meals[type].push(e);
    else meals.snack.push(e);
  }

  for (const [type, list] of Object.entries(meals)) {
    const container = document.getElementById(`meal-${type}`);
    if (!container) continue;
    if (!list.length) {
      container.innerHTML = `<p class="text-sm text-muted" style="padding:0.5rem">No ${type} logged yet</p>`;
      continue;
    }
    container.innerHTML = list.map(e => `
      <div class="meal-item">
        <span class="meal-icon">${mealIcon(type)}</span>
        <div class="meal-info">
          <div class="meal-name">${e.food_name}</div>
          <div class="meal-macros">P: ${e.protein_g}g | C: ${e.carbs_g}g | F: ${e.fats_g}g</div>
        </div>
        <span class="meal-cal">${e.calories} kcal</span>
        <button onclick="deleteNutrition('${e.id}')" class="btn-icon text-sm">🗑️</button>
      </div>
    `).join('');
  }
}

function mealIcon(type) {
  return { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' }[type] || '🍽️';
}

async function addWaterGlass(glassNum) {
  try {
    await api('POST', '/api/nutrition', {
      meal_type: 'snack', food_name: 'Water', calories: 0,
      protein_g: 0, carbs_g: 0, fats_g: 0, water_ml: 250
    });
    loadNutrition();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteNutrition(id) {
  try {
    await api('DELETE', `/api/nutrition/${id}`);
    loadNutrition();
  } catch (e) {
    toast(e.message, 'error');
  }
}

function renderMacroChart(totals) {
  const canvas = document.getElementById('macro-chart');
  if (!canvas) return;
  if (FitLife.charts.macro) FitLife.charts.macro.destroy();

  FitLife.charts.macro = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Protein', 'Carbs', 'Fats'],
      datasets: [{
        data: [totals.protein_g, totals.carbs_g, totals.fats_g],
        backgroundColor: ['rgba(99,102,241,0.8)', 'rgba(245,158,11,0.8)', 'rgba(239,68,68,0.8)'],
        borderWidth: 0,
      }]
    },
    options: {
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, padding: 12 } },
      }
    }
  });
}

// ---- Add Meal Modal ----
document.addEventListener('DOMContentLoaded', () => {
  const addMealBtn = document.getElementById('btn-add-meal');
  if (addMealBtn) addMealBtn.addEventListener('click', () => openModal('modal-add-meal'));

  const form = document.getElementById('form-add-meal');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const entry = {
        meal_type: document.getElementById('meal-type').value,
        food_name: document.getElementById('meal-food').value.trim(),
        calories: parseFloat(document.getElementById('meal-calories').value) || 0,
        protein_g: parseFloat(document.getElementById('meal-protein').value) || 0,
        carbs_g: parseFloat(document.getElementById('meal-carbs').value) || 0,
        fats_g: parseFloat(document.getElementById('meal-fats').value) || 0,
        water_ml: 0,
      };
      if (!entry.food_name) return toast('Please enter food name', 'warning');
      try {
        await api('POST', '/api/nutrition', entry);
        toast('Meal logged! 🥗', 'success');
        closeModal('modal-add-meal');
        form.reset();
        loadNutrition();
      } catch (e) {
        toast(e.message, 'error');
      }
    });
  }
});
