

import { DottedSeparator } from "@/components/dotted-separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";


const SignUpCard = () => {
  return (
    <Card className="w-full h-full md:w-[487px] border-none shadow-none">
        <CardHeader className="flex items-center justify-center text-center p-7">
            <CardTitle className="text-2xl">Joinn the group</CardTitle>
        </CardHeader>
        <div className="px-7 ">
            <DottedSeparator/>
        </div>
        <CardContent className="p-7">
            <form className="space-y-4">
                <Input required
                type="name"
                value={""}
                onChange={()=>{}}
                placeholder="Enter your name"
                disabled={false}
                />
                <Input required
                type="email"
                value={""}
                onChange={()=>{}}
                placeholder="Enter email address"
                disabled={false}
                />
                <Input required
                type="password"
                value={""}
                onChange={()=>{}}
                placeholder="Enter  password"
                disabled={false}
                />
                <Button disabled={false} className="w-full">
                    Sign Up
                </Button>
            </form>
        </CardContent>
    </Card>
  )
}

export default SignUpCard