import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { monthName, shiftMonth } from '../lib/display-date';
import { localDate } from '../lib/validation';
import { PocketButton } from './pocket-button';
import { useUI } from './bulsa-form';

export function MonthPicker({ value, onChange, allowAll = false }: {value:string; onChange:(month:string)=>void; allowAll?:boolean}) {
  const ui = useUI(), current = localDate().slice(0,7), selected = value || current;
  const [choosing, setChoosing] = useState(false);
  const [year, setYear] = useState(Number(selected.slice(0,4)));
  return <View style={ui.card}>
    <Text style={ui.caption}>Month</Text>
    <View style={ui.row}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous Month" disabled={selected==='0001-01'} onPress={()=>onChange(shiftMonth(selected,-1))} style={[ui.choice, { minWidth: 48, alignItems: 'center' }]}><Text style={ui.heading}>‹</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Choose Month" accessibilityState={{ expanded: choosing }} onPress={()=>{ setYear(Number(selected.slice(0,4))); setChoosing(v=>!v); }} style={{ flex: 1, minWidth: 120, minHeight: 48, justifyContent: 'center' }}><Text accessibilityLiveRegion="polite" style={[ui.heading,{textAlign:'center'}]}>{value ? monthName(value) : 'All Months'}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Next Month" disabled={selected==='9999-12'} onPress={()=>onChange(shiftMonth(selected,1))} style={[ui.choice, { minWidth: 48, alignItems: 'center' }]}><Text style={ui.heading}>›</Text></Pressable>
    </View>
    {choosing && <View style={{gap:12}}>
      <View style={ui.row}><PocketButton secondary title="Previous Year" disabled={year===1} onPress={()=>setYear(y=>y-1)} /><Text style={ui.heading}>{year}</Text><PocketButton secondary title="Next Year" disabled={year===9999} onPress={()=>setYear(y=>y+1)} /></View>
      <View style={ui.row}>{Array.from({length:12},(_,i)=>{const month=`${String(year).padStart(4,'0')}-${String(i+1).padStart(2,'0')}`; return <PocketButton key={month} secondary={month!==value} title={monthName(month).split(' ')[0]} onPress={()=>{onChange(month);setChoosing(false);}} />;})}</View>
    </View>}
    <View style={ui.row}>
      <PocketButton secondary title="This Month" onPress={()=>onChange(current)} />
      {allowAll && <PocketButton secondary title="All Months" onPress={()=>onChange('')} />}
    </View>
  </View>;
}
