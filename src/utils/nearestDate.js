import React from "react"
import { mockEvents } from "../data/mockEvents.js"

export const dates_data = mockEvents.map((dates)=> dates.date)
export const nearest_date = mockEvents.map((dates) => dates).sort((a,b)=> (a.date >b.date) ? 1:-1)

console.log(nearest_date)
 