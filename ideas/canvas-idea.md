-> Upload slide / canvas scrape: slides / lecture info / materials / assignments / paper / pyp

-> Open AI Identify scopes

-> If multiple scopes: ask user -> select scopes + objective (if unspecified in prompt)

-> For each scope
	- Keywords
	- what else appears when u search (bunch of) keywords
		- what other sets of keywords
	- top universities of the scope / keywords
	- search for materials FROM the universities

-> Launch tinyfish subagents to scrape from those universities
	- First look at the topic
	- then identify the materials with the keywords

-> Return target points

-> Feed target points to 2nd wave of tinyfishes
  - retrieve & digest
  - compare with existing information

-> Record analysis

-> Generate response + reference materials