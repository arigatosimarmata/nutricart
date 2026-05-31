const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
const content = fs.readFileSync(filePath, 'utf8');

// We will find the exact block starting from line 1085: <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
// up to line 1170: </div> (right before </motion.div>)
// Since we want to be highly precise, we'll search by unique content markers.

const startMarker = '<div className="grid grid-cols-1 md:grid-cols-2 gap-4">';
const endMarker = '</div>\n\n                      </motion.div>';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  console.log("Found both markers! Replacing the middle block...");
  
  const beforeBlock = content.substring(0, startIndex);
  const afterBlock = content.substring(endIndex + 6); // Keep the </div>\n\n                      </motion.div> part
  
  const replacement = `<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {aiResult.recommended_recipes && Array.isArray(aiResult.recommended_recipes) ? (
                            aiResult.recommended_recipes.map((rcp: any) => (
                              <div key={rcp.id || rcp.title} className="rounded-2xl bg-white border border-slate-200 hover:border-slate-350 transition overflow-hidden shadow-xs">
                                <div className="relative h-32 bg-slate-100">
                                  <img 
                                    src={rcp.image_res_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400"} 
                                    alt={rcp.title} 
                                    referrerPolicy="no-referrer"
                                    className="h-full w-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                                    <span className="rounded bg-sky-50 text-sky-700 text-[10px] uppercase font-bold px-2.5 py-1 border border-sky-200">
                                      {rcp.category}
                                    </span>
                                    <span className="rounded bg-white/90 text-slate-800 border border-slate-200 text-[10px] font-mono px-2 py-1 font-bold">
                                      ⭐ {rcp.rating}
                                    </span>
                                  </div>
                                </div>

                                <div className="p-4 space-y-3">
                                  <div>
                                    <h4 className="font-bold text-slate-950 text-base leading-tight">{rcp.title}</h4>
                                    <div className="flex gap-2 text-[10px] text-slate-500 font-semibold mt-1">
                                      <span>⏱ {rcp.duration_minutes} Mnt</span>
                                      <span>•</span>
                                      <span>📊 {rcp.difficulty}</span>
                                      <span>•</span>
                                      <span className="text-emerald-700">🔥 {rcp.nutrition_tag}</span>
                                    </div>
                                  </div>

                                  {/* Macros list */}
                                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                    <div className="grid grid-cols-4 gap-1 text-[10px] text-center">
                                      <div>
                                        <div className="text-slate-500">Kalori</div>
                                        <div className="text-slate-900 font-bold">{rcp.macros?.calories}kcal</div>
                                      </div>
                                      <div>
                                        <div className="text-slate-500">Protein</div>
                                        <div className="text-emerald-700 font-bold">{rcp.macros?.protein_g}g</div>
                                      </div>
                                      <div>
                                        <div className="text-slate-500">Karbo</div>
                                        <div className="text-slate-900 font-bold">{rcp.macros?.carbs_g}g</div>
                                      </div>
                                      <div>
                                        <div className="text-slate-500">Serat</div>
                                        <div className="text-emerald-700 font-bold">{rcp.macros?.fiber_g}g</div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Ingredients preview */}
                                  <div className="space-y-1">
                                    <div className="text-[11px] font-bold text-slate-600">Bahan Baku:</div>
                                    <ul className="text-[10px] text-slate-700 list-disc list-inside space-y-0.5">
                                      {rcp.ingredients_list?.slice(0, 3).map((ing: string, i: number) => (
                                        <li key={i}>{ing}</li>
                                      ))}
                                      {rcp.ingredients_list?.length > 3 && (
                                        <li className="text-slate-400 font-medium list-none pl-3">
                                          + {rcp.ingredients_list.length - 3} bahan lainnya...
                                        </li>
                                      )}
                                    </ul>
                                  </div>

                                  {/* Steps preview */}
                                  <div className="space-y-1">
                                    <div className="text-[11px] font-bold text-slate-600">Instruksi Sajian:</div>
                                    <ol className="text-[10px] text-slate-700 list-decimal list-inside space-y-0.5 pl-1 leading-normal">
                                      {rcp.instructions?.slice(0, 2).map((ins: string, i: number) => (
                                        <li key={i} className="line-clamp-1">{ins}</li>
                                      ))}
                                    </ol>
                                  </div>

                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-2 text-center text-xs text-slate-500 py-4">Format hasil tidak valid.</div>
                          )}
                        `;
  
  fs.writeFileSync(filePath, beforeBlock + replacement + afterBlock, 'utf8');
  console.log("Recipes refactored and balanced successfully!");
} else {
  console.log("Markers not found! startIndex:", startIndex, "endIndex:", endIndex);
}
