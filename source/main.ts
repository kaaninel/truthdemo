
namespace Demo
{
	export class Text
	{
		static Backer = `
any
object : any
string : any
number : any
bigint : any
boolean : any

/".+" : string
/(\\+|-)?(([1-9]\\d{0,17})|([1-8]\\d{18})|(9[01]\\d{17})) : number
/(0|([1-9][0-9]*)) : bigint
/(true|false) : boolean

`;
		
		static get(query: string)
		{
			const el = document.querySelector(query) as HTMLTextAreaElement | HTMLInputElement;
			return el ? el.value : "";
		}
		
		static get Code()
		{
			return Text.get("#truthcode");
		}
		
		static get Query()
		{
			return Text.get("#ttq");
		}
		
		static get Pattern()
		{
			return Text.get("#regex");
		}
	}
	
	export async function Calculate()
	{
		const def = Text.Code;
		const pattern = Text.Pattern;
		const query = Text.Query;
		
		if (def === "" || pattern === "") return;
		
		const doc = await Truth.parse(Text.Backer + def);
		
		doc.program.verify();
		
		for (const fault of doc.program.faults.each())
			console.error(fault.toString());
			
		let code = new Encoder.Code();
	
		const drill = (type: Truth.Type) => 
		{
			code.add(Encoder.Type.fromTruth(code, type));
			for (const sub of type.contents)
				drill(sub);
		};
		
		for (const type of doc.types)
			drill(type);
			
		code.link();
				
		const extracted = code.extractData(new RegExp(pattern));
		
		code = extracted.code;
		const data = extracted.data;
		
		const simplecode = JSON.parse(JSON.stringify(code));
		const simpledata = JSON.parse(JSON.stringify(data));
		
		const BCode = Backer.Code.load(simplecode);
		BCode.loadData(simpledata);
		
		Object.assign(window, Backer.Schema);
		
		let Enum = eval(`tt(${query})`);
		console.log(Enum); 
		
		const cursors = new Backer.TruthTalk.CursorSet(...Object.values(Backer.DataGraph));
		cursors.query(Enum);
		return cursors.snapshot();
	}
}